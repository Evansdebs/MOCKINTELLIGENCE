import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Lock,
  Unlock,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ShieldAlert,
  X,
  FileText,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  ArrowLeftRight,
  Activity,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Layers,
  AlertCircle,
  RefreshCw,
  Check,
  Square,
  CheckSquare,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Examination, Subject } from '../types';

interface ExamSnapshot {
  examId: string;
  examName: string;
  status: string;
  sequenceOrder: number;
  subjectCount: number;
  studentCount: number;
  average: number | null;
  passRate: number | null;
  highestAverage: number | null;
  lowestAverage: number | null;
  gradeDistribution: Record<string, number>;
}

interface MultiMockResult {
  mocks: any[];
  subjects: { id: string; name: string; code: string }[];
  subjectMatrix: any[];
  chartSeries: any[];
  baselineMockId: string;
}

const MOCK_COLORS = [
  '#2563eb', '#059669', '#7c3aed', '#d97706', '#e11d48',
  '#0891b2', '#4f46e5', '#ea580c', '#16a34a', '#9333ea',
  '#0d9488', '#be185d', '#b45309', '#1d4ed8', '#047857',
];

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'Locked':
      return { label: 'Locked', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', bar: 'bg-amber-400', icon: Lock };
    case 'Completed':
      return { label: 'Completed', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', bar: 'bg-emerald-500', icon: CheckCircle2 };
    case 'Active':
      return { label: 'Active', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', bar: 'bg-blue-500', icon: Clock };
    default:
      return { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', bar: 'bg-slate-300', icon: BookOpen };
  }
};

export const ExaminationsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<Record<string, ExamSnapshot>>({});
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Examination | null>(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Multi-mock comparison
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [classFilter, setClassFilter] = useState('all');
  const [classesList, setClassesList] = useState<any[]>([]);
  const [multiMockResult, setMultiMockResult] = useState<MultiMockResult | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonTab, setComparisonTab] = useState<'kpis' | 'subjects' | 'chart'>('kpis');

  // Form states
  const [formName, setFormName] = useState('');
  const [formYear, setFormYear] = useState('2025/2026');
  const [formDesc, setFormDesc] = useState('');
  const [formSeq, setFormSeq] = useState<number | ''>('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    if (searchParams.get('new') === 'true') setIsCreateModalOpen(true);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [examRes, subRes, studRes] = await Promise.all([
        api.getExaminations(),
        api.getSubjects(),
        api.getStudents(),
      ]);
      const exams = examRes.examinations || [];
      setExaminations(exams);
      setSubjects(subRes.subjects || []);
      if (studRes?.classes) setClassesList(studRes.classes);
      if (selectedSubjectIds.length === 0 && subRes.subjects) {
        setSelectedSubjectIds(subRes.subjects.map((s: Subject) => s.id));
      }
      loadSnapshots(exams);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSnapshots = async (exams: Examination[]) => {
    const results: Record<string, ExamSnapshot> = {};
    await Promise.allSettled(
      exams.map(async (exam) => {
        try {
          const snap = await api.getExamSnapshot(exam.id);
          results[exam.id] = snap;
        } catch {}
      })
    );
    setSnapshots(results);
  };

  const toggleCompareId = (id: string) => {
    setSelectedCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    setMultiMockResult(null); // reset results when selection changes
  };

  const selectAllForCompare = () => {
    setSelectedCompareIds(examinations.map(e => e.id));
    setMultiMockResult(null);
  };

  const clearCompareSelection = () => {
    setSelectedCompareIds([]);
    setMultiMockResult(null);
  };

  const handleRunComparison = async () => {
    if (selectedCompareIds.length < 1) return;
    setComparisonLoading(true);
    try {
      const res = await api.compareMultipleMocks(
        selectedCompareIds,
        classFilter !== 'all' ? classFilter : undefined
      );
      setMultiMockResult(res);
      setComparisonTab('kpis');
    } catch (err) {
      console.error(err);
    } finally {
      setComparisonLoading(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formName.trim()) { setFormError('Examination name is required.'); return; }
    try {
      setActionLoading(true);
      await api.createExamination({
        name: formName.trim(),
        academicYear: formYear,
        description: formDesc.trim(),
        sequenceOrder: formSeq ? Number(formSeq) : undefined,
        startDate: formStartDate || undefined,
        endDate: formEndDate || undefined,
        subjectIds: selectedSubjectIds,
      });
      setIsCreateModalOpen(false);
      setFormName(''); setFormDesc(''); setFormStartDate(''); setFormEndDate('');
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create examination.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteExam = async () => {
    if (!selectedExam) return;
    try {
      setActionLoading(true);
      await api.completeExamination(selectedExam.id);
      setIsCompleteModalOpen(false);
      setSelectedExam(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to complete examination.');
    } finally { setActionLoading(false); }
  };

  const handleLockExam = async () => {
    if (!selectedExam) return;
    try {
      setActionLoading(true);
      await api.lockExamination(selectedExam.id);
      setIsLockModalOpen(false);
      setSelectedExam(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to lock examination.');
    } finally { setActionLoading(false); }
  };

  const handleUnlockExam = async () => {
    if (!selectedExam) return;
    try {
      setActionLoading(true);
      await api.unlockExamination(selectedExam.id, unlockReason);
      setIsUnlockModalOpen(false);
      setSelectedExam(null);
      setUnlockReason('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to unlock examination.');
    } finally { setActionLoading(false); }
  };

  const toggleSubjectSelect = (subId: string) =>
    setSelectedSubjectIds(prev => prev.includes(subId) ? prev.filter(id => id !== subId) : [...prev, subId]);

  const getDeltaBadge = (val: number | null, unit = '%') => {
    if (val === null || val === undefined) return <span className="text-slate-300">—</span>;
    if (val > 0) return <span className="text-emerald-600 font-bold text-xs">▲ +{val}{unit}</span>;
    if (val < 0) return <span className="text-rose-600 font-bold text-xs">▼ {val}{unit}</span>;
    return <span className="text-slate-400 font-semibold text-xs">→ 0{unit}</span>;
  };

  const getProgressBadge = (status: string) => {
    if (status === 'Baseline') return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">Baseline</span>;
    if (status === 'Improving') return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Improving</span>;
    if (status === 'Declining') return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Declining</span>;
    return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center gap-1"><Minus className="w-3 h-3" /> Stable</span>;
  };

  const buildChartData = () => {
    if (!multiMockResult) return [];
    return multiMockResult.chartSeries.map(s => ({
      name: `M${s.sequence}`,
      fullName: s.mockName,
      average: s.average,
      passRate: s.passRate,
    }));
  };

  // Build subject chart data — one data point per subject showing each mock's average
  const buildSubjectChartData = () => {
    if (!multiMockResult) return [];
    return multiMockResult.subjectMatrix.slice(0, 10).map((row: any) => {
      const entry: any = { subject: row.subjectCode };
      multiMockResult.mocks.forEach((m: any) => {
        entry[`M${m.sequenceOrder}`] = row[m.examId] ?? null;
      });
      return entry;
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs uppercase tracking-wider mb-1.5 border border-blue-200">
            <Layers className="w-3.5 h-3.5" />
            Examination Management
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mock Examinations</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, manage and compare unlimited Basic 9 mock examinations across any period
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setCompareMode(!compareMode); setMultiMockResult(null); setSelectedCompareIds([]); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
              compareMode
                ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/30'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>{compareMode ? 'Exit Compare Mode' : 'Compare Mocks'}</span>
          </button>
          <button
            onClick={() => navigate('/analytics?tab=comparison')}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:border-slate-300 transition-all"
          >
            <Activity className="w-4 h-4 text-blue-500" />
            <span>Full Intelligence</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => { setFormSeq(examinations.length + 1); setIsCreateModalOpen(true); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Mock Exam</span>
            </button>
          )}
        </div>
      </div>

      {/* ===== SERIES PROGRESS STRIP ===== */}
      {!loading && examinations.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Examination Series — {examinations.length} Mock{examinations.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-slate-400">
              {examinations.filter(e => e.status === 'Completed' || e.status === 'Locked').length} completed · {examinations.filter(e => e.status === 'Active').length} active
            </span>
          </div>
          <div className="flex items-stretch gap-0.5 overflow-x-auto">
            {examinations.map((exam, idx) => {
              const sc = getStatusConfig(exam.status);
              const snap = snapshots[exam.id];
              return (
                <React.Fragment key={exam.id}>
                  <div
                    className="flex-shrink-0 relative group cursor-pointer"
                    style={{ minWidth: `${Math.max(60, 100 / examinations.length)}px` }}
                    onClick={() => navigate(`/scores?examId=${exam.id}`)}
                  >
                    <div className={`h-10 rounded-lg ${sc.bg} ${sc.border} border flex flex-col items-center justify-center px-1 hover:opacity-80 transition-opacity`}>
                      <span className={`text-[10px] font-black ${sc.text}`}>M{exam.sequenceOrder}</span>
                      {snap?.average && <span className={`text-[9px] font-bold ${sc.text} opacity-70`}>{snap.average}%</span>}
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-900 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none shadow-xl">
                      <div className="font-bold">{exam.name}</div>
                      <div className="opacity-70">{sc.label}{snap?.average ? ` · ${snap.average}% avg` : ''}</div>
                    </div>
                  </div>
                  {idx < examinations.length - 1 && (
                    <div className="flex items-center flex-shrink-0">
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== MULTI-MOCK COMPARISON PANEL ===== */}
      {compareMode && (
        <div className="bg-slate-50 rounded-2xl border border-violet-200 shadow-sm overflow-hidden">
          {/* Panel Header */}
          <div className="px-5 py-4 border-b border-violet-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-violet-600" />
              <div>
                <h2 className="text-sm font-black text-slate-900">Multi-Mock Comparison Engine</h2>
                <p className="text-xs text-violet-600 font-medium">Select any number of mocks — compare them all simultaneously</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Class filter */}
              <select
                value={classFilter}
                onChange={e => { setClassFilter(e.target.value); setMultiMockResult(null); }}
                className="px-3 py-1.5 bg-white border border-violet-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="all">All Classes</option>
                {classesList.map(c => <option key={c.id || c} value={c.id || c}>{c.name || c}</option>)}
              </select>
            </div>
          </div>

          {/* Mock Selection Grid */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-600">
                {selectedCompareIds.length === 0
                  ? 'Select mocks to compare (minimum 1, no maximum limit)'
                  : `${selectedCompareIds.length} mock${selectedCompareIds.length !== 1 ? 's' : ''} selected`
                }
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllForCompare}
                  className="text-xs text-violet-600 hover:text-violet-800 font-bold underline underline-offset-2"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={clearCompareSelection}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {examinations.map((exam, idx) => {
                const isSelected = selectedCompareIds.includes(exam.id);
                const sc = getStatusConfig(exam.status);
                const snap = snapshots[exam.id];
                const color = MOCK_COLORS[idx % MOCK_COLORS.length];

                return (
                  <button
                    key={exam.id}
                    onClick={() => toggleCompareId(exam.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-violet-500 bg-violet-50 shadow-md shadow-violet-200'
                        : 'border-slate-200 bg-white hover:border-violet-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className="text-[10px] font-black px-1.5 py-0.5 rounded"
                        style={isSelected ? { backgroundColor: color, color: '#fff' } : { backgroundColor: '#f1f5f9', color: '#64748b' }}
                      >
                        M{exam.sequenceOrder}
                      </span>
                      {isSelected
                        ? <CheckSquare className="w-3.5 h-3.5 text-violet-600" />
                        : <Square className="w-3.5 h-3.5 text-slate-300" />
                      }
                    </div>
                    <div className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2">{exam.name}</div>
                    {snap?.average && (
                      <div className="text-[10px] text-slate-500 mt-1 font-semibold">{snap.average}% avg</div>
                    )}
                    <div className={`mt-1.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text} inline-block`}>
                      {sc.label}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Run button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleRunComparison}
                disabled={selectedCompareIds.length === 0 || comparisonLoading}
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-violet-600/30 transition-all"
              >
                {comparisonLoading
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <BarChart2 className="w-4 h-4" />
                }
                {comparisonLoading
                  ? 'Analysing...'
                  : selectedCompareIds.length === 0
                    ? 'Select mocks above'
                    : `Compare ${selectedCompareIds.length} Mock${selectedCompareIds.length !== 1 ? 's' : ''}`
                }
              </button>
              {selectedCompareIds.length > 0 && (
                <span className="text-xs text-slate-500">
                  Comparing: {examinations
                    .filter(e => selectedCompareIds.includes(e.id))
                    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
                    .map(e => `Mock ${e.sequenceOrder}`)
                    .join(' → ')}
                </span>
              )}
            </div>

            {/* ===== COMPARISON RESULTS ===== */}
            {multiMockResult && multiMockResult.mocks.length > 0 && (
              <div className="mt-4 space-y-4 animate-fadeIn">
                {/* Result Tabs */}
                <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-violet-100 w-fit">
                  {[
                    { key: 'kpis', label: 'KPI Summary' },
                    { key: 'subjects', label: 'Subject Matrix' },
                    { key: 'chart', label: 'Charts' },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setComparisonTab(tab.key as any)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        comparisonTab === tab.key
                          ? 'bg-violet-600 text-white shadow'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* ===== TAB: KPI SUMMARY TABLE ===== */}
                {comparisonTab === 'kpis' && (
                  <div className="bg-white rounded-xl border border-violet-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <h3 className="text-xs font-black text-slate-800">Cross-Mock KPI Comparison</h3>
                      <p className="text-[11px] text-slate-400">All metrics are class averages. Δ Prev = change from previous mock. Δ Base = change from earliest selected mock.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4 text-left sticky left-0 bg-slate-50 z-10">Mock Examination</th>
                            <th className="py-3 px-3 text-center">Sequence</th>
                            <th className="py-3 px-3 text-center">Status</th>
                            <th className="py-3 px-3 text-center">Students</th>
                            <th className="py-3 px-3 text-center">Class Avg</th>
                            <th className="py-3 px-3 text-center">Pass Rate</th>
                            <th className="py-3 px-3 text-center">Highest</th>
                            <th className="py-3 px-3 text-center">Lowest</th>
                            <th className="py-3 px-3 text-center">Δ vs Prev</th>
                            <th className="py-3 px-3 text-center">Δ vs Baseline</th>
                            <th className="py-3 px-3 text-center">Progress</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {multiMockResult.mocks.map((mock: any, idx: number) => {
                            const color = MOCK_COLORS[
                              examinations.findIndex(e => e.id === mock.examId) % MOCK_COLORS.length
                            ];
                            return (
                              <tr key={mock.examId} className={`hover:bg-violet-50/40 transition-colors ${idx === 0 ? 'bg-slate-50/50' : ''}`}>
                                <td className="py-3 px-4 sticky left-0 bg-white z-10">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                    <span className="font-bold text-slate-900 text-xs">{mock.examName}</span>
                                    {idx === 0 && <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-bold uppercase">Base</span>}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">#{mock.sequenceOrder}</td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getStatusConfig(mock.status).bg} ${getStatusConfig(mock.status).text}`}>
                                    {getStatusConfig(mock.status).label}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center font-semibold text-slate-700">{mock.studentCount}</td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`font-black text-sm ${
                                    (mock.classAverage ?? 0) >= 70 ? 'text-emerald-600' :
                                    (mock.classAverage ?? 0) >= 50 ? 'text-blue-600' : 'text-rose-600'
                                  }`}>
                                    {mock.classAverage !== null ? `${mock.classAverage}%` : '—'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`font-bold ${
                                    (mock.passRate ?? 0) >= 70 ? 'text-emerald-600' :
                                    (mock.passRate ?? 0) >= 50 ? 'text-amber-600' : 'text-rose-600'
                                  }`}>
                                    {mock.passRate !== null ? `${mock.passRate}%` : '—'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center text-emerald-600 font-bold">
                                  {mock.highestAverage !== null ? `${mock.highestAverage}%` : '—'}
                                </td>
                                <td className="py-3 px-3 text-center text-rose-500 font-bold">
                                  {mock.lowestAverage !== null ? `${mock.lowestAverage}%` : '—'}
                                </td>
                                <td className="py-3 px-3 text-center">{getDeltaBadge(mock.deltaVsPrevious)}</td>
                                <td className="py-3 px-3 text-center">{getDeltaBadge(mock.deltaVsBaseline)}</td>
                                <td className="py-3 px-3 text-center">{getProgressBadge(mock.progressStatus)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Grade distribution footer */}
                    <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Grade Distribution per Mock</div>
                      <div className="flex flex-wrap gap-3">
                        {multiMockResult.mocks.map((mock: any, idx) => {
                          const color = MOCK_COLORS[
                            examinations.findIndex(e => e.id === mock.examId) % MOCK_COLORS.length
                          ];
                          return (
                            <div key={mock.examId} className="text-xs">
                              <div className="flex items-center gap-1 mb-1">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                <span className="font-bold text-slate-700">Mock {mock.sequenceOrder}:</span>
                              </div>
                              <div className="flex gap-1 flex-wrap">
                                {Object.entries(mock.gradeDistribution)
                                  .sort((a, b) => a[0].localeCompare(b[0]))
                                  .map(([g, c]) => (
                                    <span key={g} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600">
                                      {g}:{c as number}
                                    </span>
                                  ))
                                }
                                {Object.keys(mock.gradeDistribution).length === 0 && <span className="text-slate-300 text-[10px]">No data</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ===== TAB: SUBJECT MATRIX ===== */}
                {comparisonTab === 'subjects' && (
                  <div className="bg-white rounded-xl border border-violet-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <h3 className="text-xs font-black text-slate-800">Subject Performance Matrix</h3>
                      <p className="text-[11px] text-slate-400">Average percentage per subject, per mock. Net Change = last mock vs first selected.</p>
                    </div>
                    <div className="overflow-x-auto max-h-[480px]">
                      <table className="w-full text-xs border-collapse">
                        <thead className="sticky top-0 bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 z-10">
                          <tr>
                            <th className="py-3 px-4 text-left sticky left-0 bg-slate-50 z-20 min-w-[160px]">Subject</th>
                            {multiMockResult.mocks.map((m: any, idx: number) => (
                              <th key={m.examId} className="py-3 px-3 text-center min-w-[80px]">
                                <div className="flex flex-col items-center gap-0.5">
                                  <span
                                    className="w-2 h-2 rounded-full inline-block"
                                    style={{ backgroundColor: MOCK_COLORS[examinations.findIndex(e => e.id === m.examId) % MOCK_COLORS.length] }}
                                  />
                                  <span>Mock {m.sequenceOrder}</span>
                                </div>
                              </th>
                            ))}
                            <th className="py-3 px-3 text-center bg-slate-100/80 min-w-[80px]">Net Δ</th>
                            <th className="py-3 px-3 text-center min-w-[100px]">Trend</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {multiMockResult.subjectMatrix.map((row: any) => (
                            <tr key={row.subjectId} className="hover:bg-violet-50/30 transition-colors">
                              <td className="py-2.5 px-4 sticky left-0 bg-white z-10">
                                <span className="font-bold text-slate-800">{row.subjectName}</span>
                                <span className="ml-1 text-slate-400 font-mono text-[10px]">({row.subjectCode})</span>
                              </td>
                              {multiMockResult.mocks.map((m: any) => {
                                const val = row[m.examId];
                                return (
                                  <td key={m.examId} className="py-2.5 px-3 text-center">
                                    {val !== null && val !== undefined ? (
                                      <span className={`font-bold text-xs ${
                                        val >= 70 ? 'text-emerald-600' :
                                        val >= 50 ? 'text-blue-600' :
                                        val >= 40 ? 'text-amber-600' : 'text-rose-600'
                                      }`}>
                                        {val}%
                                      </span>
                                    ) : (
                                      <span className="text-slate-200">—</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="py-2.5 px-3 text-center bg-slate-50/60">
                                {getDeltaBadge(row.netChange)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  row.trend === 'Improving' ? 'bg-emerald-100 text-emerald-700' :
                                  row.trend === 'Declining' ? 'bg-rose-100 text-rose-700' :
                                  row.trend === 'Stable' ? 'bg-slate-100 text-slate-600' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {row.trend || '—'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ===== TAB: CHARTS ===== */}
                {comparisonTab === 'chart' && (
                  <div className="space-y-4">
                    {/* Class Average Line/Bar Chart */}
                    <div className="bg-white rounded-xl border border-violet-100 p-4">
                      <h3 className="text-xs font-black text-slate-800 mb-1">Class Average Across Selected Mocks</h3>
                      <p className="text-[11px] text-slate-400 mb-3">Sequential progression of cohort mean performance</p>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={buildChartData()} barCategoryGap="35%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '10px', fontSize: '11px' }}
                              formatter={(val: any, name: string) => [`${val}%`, name]}
                              labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                            />
                            <Bar dataKey="average" name="Class Average" radius={[5, 5, 0, 0]}
                              fill="url(#avgGrad)"
                            />
                            <defs>
                              <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#7c3aed" />
                                <stop offset="100%" stopColor="#4f46e5" />
                              </linearGradient>
                            </defs>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Pass Rate comparison */}
                    <div className="bg-white rounded-xl border border-violet-100 p-4">
                      <h3 className="text-xs font-black text-slate-800 mb-1">Pass Rate Trend</h3>
                      <p className="text-[11px] text-slate-400 mb-3">Percentage of students meeting or exceeding pass threshold</p>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={buildChartData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '10px', fontSize: '11px' }}
                              formatter={(val: any) => [`${val}%`, 'Pass Rate']}
                              labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                            />
                            <Line dataKey="passRate" name="Pass Rate" stroke="#059669" strokeWidth={3}
                              dot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                              activeDot={{ r: 8 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Subject comparison bar chart (grouped per mock) */}
                    {multiMockResult.mocks.length > 1 && buildSubjectChartData().length > 0 && (
                      <div className="bg-white rounded-xl border border-violet-100 p-4">
                        <h3 className="text-xs font-black text-slate-800 mb-1">Subject Averages by Mock (Top 10 Subjects)</h3>
                        <p className="text-[11px] text-slate-400 mb-3">Grouped bars — each cluster is a subject, each color a mock</p>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={buildSubjectChartData()} barCategoryGap="20%">
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '10px', fontSize: '11px' }}
                                formatter={(val: any) => [`${val}%`]}
                              />
                              <Legend wrapperStyle={{ fontSize: '10px' }} />
                              {multiMockResult.mocks.map((m: any, idx: number) => (
                                <Bar
                                  key={m.examId}
                                  dataKey={`M${m.sequenceOrder}`}
                                  name={m.examName}
                                  fill={MOCK_COLORS[examinations.findIndex(e => e.id === m.examId) % MOCK_COLORS.length]}
                                  radius={[3, 3, 0, 0]}
                                />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom CTA */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => navigate('/analytics?tab=comparison')}
                    className="flex-1 max-w-xs py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-violet-600/30 transition-all"
                  >
                    <Activity className="w-4 h-4" />
                    Open Full Intelligence Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== EXAM CARDS GRID ===== */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : examinations.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 border border-slate-200/80 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Mock Examinations Yet</h3>
          <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
            Create your first mock examination. The system supports unlimited mocks — compare any number at any time.
          </p>
          {isAdmin && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-5 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 hover:bg-blue-500 transition-colors"
            >
              + Create First Mock Examination
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {examinations.map((exam, examIdx) => {
            const sc = getStatusConfig(exam.status);
            const snap = snapshots[exam.id];
            const isLocked = exam.status === 'Locked';
            const isCompleted = exam.status === 'Completed';
            const isExpanded = expandedCard === exam.id;
            const StatusIcon = sc.icon;
            const isSelectedForCompare = selectedCompareIds.includes(exam.id);
            const cardColor = MOCK_COLORS[examIdx % MOCK_COLORS.length];

            return (
              <div
                key={exam.id}
                className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col ${
                  isSelectedForCompare
                    ? 'border-violet-400 shadow-md shadow-violet-200/50'
                    : isLocked
                    ? 'border-amber-200 shadow-sm'
                    : isCompleted
                    ? 'border-emerald-200 shadow-sm'
                    : 'border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow-md'
                }`}
              >
                {/* Top accent bar */}
                <div className="h-1.5 rounded-t-2xl" style={{ backgroundColor: cardColor }} />

                <div className="p-5 flex flex-col flex-1">
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-black">
                        Mock #{exam.sequenceOrder}
                      </span>
                      {compareMode && (
                        <button
                          onClick={() => toggleCompareId(exam.id)}
                          className={`p-1 rounded-lg transition-all ${
                            isSelectedForCompare
                              ? 'bg-violet-600 text-white'
                              : 'bg-slate-100 text-slate-400 hover:bg-violet-100 hover:text-violet-600'
                          }`}
                          title={isSelectedForCompare ? 'Remove from comparison' : 'Add to comparison'}
                        >
                          {isSelectedForCompare ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${sc.bg} ${sc.text} ${sc.border} border`}>
                      <StatusIcon className="w-3 h-3" />
                      {sc.label}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug mb-1">{exam.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                    {exam.description || 'Basic 9 mock performance examination.'}
                  </p>

                  {/* KPI Pills */}
                  {snap && snap.studentCount > 0 ? (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-[10px] text-slate-400 font-semibold">Avg</div>
                        <div className={`text-sm font-black ${(snap.average ?? 0) >= 70 ? 'text-emerald-600' : (snap.average ?? 0) >= 50 ? 'text-blue-600' : 'text-rose-600'}`}>
                          {snap.average ?? '—'}%
                        </div>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-[10px] text-slate-400 font-semibold">Pass</div>
                        <div className={`text-sm font-black ${(snap.passRate ?? 0) >= 70 ? 'text-emerald-600' : (snap.passRate ?? 0) >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {snap.passRate ?? '—'}%
                        </div>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-[10px] text-slate-400 font-semibold">Students</div>
                        <div className="text-sm font-black text-slate-800">{snap.studentCount}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400 font-semibold">
                      No scores entered yet
                    </div>
                  )}

                  {/* Expanded Stats */}
                  {isExpanded && snap && snap.studentCount > 0 && (
                    <div className="mb-3 space-y-1.5 animate-fadeIn">
                      <div className="flex justify-between text-xs px-1">
                        <span className="text-slate-400 font-semibold">Highest Average</span>
                        <span className="font-black text-emerald-600">{snap.highestAverage}%</span>
                      </div>
                      <div className="flex justify-between text-xs px-1">
                        <span className="text-slate-400 font-semibold">Lowest Average</span>
                        <span className="font-black text-rose-600">{snap.lowestAverage}%</span>
                      </div>
                      <div className="flex justify-between text-xs px-1">
                        <span className="text-slate-400 font-semibold">Subjects Assessed</span>
                        <span className="font-bold text-slate-700">{snap.subjectCount}</span>
                      </div>
                      {Object.keys(snap.gradeDistribution).length > 0 && (
                        <div className="pt-1.5">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Grade Distribution</div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(snap.gradeDistribution)
                              .sort((a, b) => a[0].localeCompare(b[0]))
                              .map(([g, c]) => (
                                <span key={g} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold border border-blue-100">
                                  {g}: {c}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {snap && snap.studentCount > 0 && (
                    <button
                      onClick={() => setExpandedCard(isExpanded ? null : exam.id)}
                      className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold flex items-center gap-1 mb-3 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {isExpanded ? 'Show less' : 'Detailed stats'}
                    </button>
                  )}

                  {isLocked && exam.lockedBy && (
                    <div className="flex justify-between text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-100 mb-3">
                      <span>Locked by</span>
                      <span className="font-bold">{exam.lockedBy}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/scores?examId=${exam.id}`)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Enter / View Scores">
                        <FileSpreadsheet className="w-4 h-4" />
                      </button>
                      <button onClick={() => navigate(`/results?examId=${exam.id}`)} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="View Results">
                        <FileText className="w-4 h-4" />
                      </button>
                      <button onClick={() => navigate('/analytics')} className="p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors" title="Analytics">
                        <BarChart2 className="w-4 h-4" />
                      </button>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        {isLocked ? (
                          <button
                            onClick={() => { setSelectedExam(exam); setIsUnlockModalOpen(true); }}
                            className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold flex items-center gap-1 border border-amber-200 transition-colors"
                          >
                            <Unlock className="w-3.5 h-3.5" /> Unlock
                          </button>
                        ) : isCompleted ? (
                          <button
                            onClick={() => { setSelectedExam(exam); setIsLockModalOpen(true); }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <Lock className="w-3.5 h-3.5" /> Lock
                          </button>
                        ) : (
                          <button
                            onClick={() => { setSelectedExam(exam); setIsCompleteModalOpen(true); }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm shadow-emerald-600/30 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Complete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lifecycle Info */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Info className="w-4 h-4 text-slate-400" />
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Mock Lifecycle</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: 'Active', desc: 'Open for score entry', color: 'bg-blue-100 text-blue-700' },
            { label: '→', color: 'text-slate-300', desc: '' },
            { label: 'Completed', desc: 'Scores finalised — full analytics & comparison enabled', color: 'bg-emerald-100 text-emerald-700' },
            { label: '→', color: 'text-slate-300', desc: '' },
            { label: 'Locked', desc: 'Read-only — protected archive', color: 'bg-amber-100 text-amber-700' },
          ].map((s, i) => (
            <span key={i} className={s.desc ? `px-2 py-0.5 rounded-full font-bold ${s.color}` : `font-black ${s.color}`}>
              {s.label}{s.desc && <span className="font-normal opacity-75 ml-1 hidden sm:inline">· {s.desc}</span>}
            </span>
          ))}
        </div>
        <span className="text-slate-400 ml-auto hidden sm:block">Unlimited mocks supported</span>
      </div>

      {/* ===== MODALS ===== */}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Create Mock Examination</h3>
                <p className="text-xs text-slate-500 mt-0.5">Set up a new sequential mock — create as many as needed</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{formError}
              </div>
            )}
            <form onSubmit={handleCreateExam} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Examination Name *</label>
                <input type="text" required placeholder="e.g. 2026 Basic 9 Mock 6" value={formName} onChange={e => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year</label>
                  <input type="text" value={formYear} onChange={e => setFormYear(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sequence Order</label>
                  <input type="number" min="1" value={formSeq} onChange={e => setFormSeq(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                  <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                  <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Focus Area</label>
                <textarea rows={2} value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="e.g. Final diagnostic mock covering full BECE syllabus..."
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Assign Subjects ({selectedSubjectIds.length} selected)</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {subjects.map(sub => (
                    <label key={sub.id} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer p-1.5 hover:bg-white rounded-lg transition-colors">
                      <input type="checkbox" checked={selectedSubjectIds.includes(sub.id)} onChange={() => toggleSubjectSelect(sub.id)}
                        className="rounded text-blue-600 focus:ring-blue-500" />
                      <span className="truncate">{sub.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button type="button" onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={actionLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-2 disabled:opacity-60">
                  {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Create Mock Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {isCompleteModalOpen && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Mark as Completed?</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-sm mx-auto">
              This finalises all scores for <span className="font-bold text-slate-900">"{selectedExam.name}"</span>. The full analytics and comparison data for this mock will be permanently preserved and available for cross-mock analysis.
            </p>
            <div className="mt-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 font-medium border border-blue-100 text-left">
              <strong>📊 After completing:</strong> This mock becomes immediately available in the Multi-Mock Comparison Engine alongside all other completed mocks.
            </div>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button onClick={() => setIsCompleteModalOpen(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={handleCompleteExam} disabled={actionLoading}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-2 disabled:opacity-60">
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Yes, Mark as Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock Modal */}
      {isLockModalOpen && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Lock Examination?</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Locking <span className="font-bold text-slate-900">"{selectedExam.name}"</span> makes all scores permanently read-only.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button onClick={() => setIsLockModalOpen(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={handleLockExam} disabled={actionLoading}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/30 flex items-center gap-2 disabled:opacity-60">
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Yes, Lock Examination
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Modal */}
      {isUnlockModalOpen && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Unlock className="w-5 h-5" /></div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Unlock Examination</h3>
                <p className="text-xs text-slate-500">Requires administrative authorization</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Unlocking <span className="font-bold text-slate-900">"{selectedExam.name}"</span> will re-enable score modification. Permanently recorded in audit logs.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">Authorization Reason *</label>
              <input type="text" placeholder="e.g. Remedial mark recalculation" value={unlockReason} onChange={e => setUnlockReason(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <button onClick={() => setIsUnlockModalOpen(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={handleUnlockExam} disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-2 disabled:opacity-60">
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm & Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
