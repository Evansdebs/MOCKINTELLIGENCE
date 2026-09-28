import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  BarChart2,
  LineChart as LineChartIcon,
  Grid,
  Users,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Check,
  Award,
  Download,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import html2canvas from 'html2canvas';
import { api } from '../services/api';
import { Student } from '../types';

export const MockIntelligencePage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'subjects' | 'comparison' | 'heatmap' | 'students' | 'alerts'
  >('overview');

  const [classFilter, setClassFilter] = useState('all');
  const [classesList, setClassesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Data states
  const [overviewKPIs, setOverviewKPIs] = useState<any>(null);
  const [subjectData, setSubjectData] = useState<any>(null);
  const [mockComparison, setMockComparison] = useState<any>(null);
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [weakAreasData, setWeakAreasData] = useState<any>(null);

  // Multi-student comparison
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [comparisonResults, setComparisonResults] = useState<any>(null);

  // Subject line toggles
  const [visibleSubjects, setVisibleSubjects] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'subjects', 'comparison', 'heatmap', 'students', 'alerts'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
    init();
  }, []);

  useEffect(() => {
    loadAllIntelligenceData();
  }, [classFilter]);

  const init = async () => {
    try {
      const [studentsRes, examsRes] = await Promise.all([
        api.getStudents(),
        api.getExaminations(),
      ]);
      const sts = studentsRes.students || [];
      setAllStudents(sts);
      if (studentsRes?.classes) setClassesList(studentsRes.classes);

      // Pre-select first 3 students for comparison
      if (sts.length >= 3) {
        setSelectedStudentIds([sts[0].id, sts[1].id, sts[2].id]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAllIntelligenceData = async () => {
    try {
      setLoading(true);
      const [kpis, subs, mocks, weak] = await Promise.all([
        api.getOverview({ class: classFilter }),
        api.getSubjectTrends({ class: classFilter }),
        api.getMockComparison({ class: classFilter }),
        api.getWeakAreasAndAlerts({ class: classFilter }),
      ]);

      setOverviewKPIs(kpis);
      setSubjectData(subs);
      setMockComparison(mocks);
      setWeakAreasData(weak);

      // Initialize subject visibility
      if (subs?.subjects) {
        const vis: Record<string, boolean> = {};
        subs.subjects.forEach((s: any, idx: number) => {
          vis[s.name] = idx < 5; // Default show top 5
        });
        setVisibleSubjects(vis);
      }

      // Load heatmap for latest mock
      if (kpis?.examTrends?.length > 0) {
        const latestExamId = kpis.examTrends[kpis.examTrends.length - 1].examId;
        const heat = await api.getHeatmap({ examinationId: latestExamId, class: classFilter });
        setHeatmapData(heat);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunComparison = async () => {
    if (selectedStudentIds.length === 0) return;
    try {
      const res = await api.compareStudents(selectedStudentIds);
      setComparisonResults(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportChart = async (elementId: string, filename: string) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    try {
      // Small timeout to ensure rendering is complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      const canvas = await html2canvas(el, { backgroundColor: null });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.png`;
      a.click();
    } catch (err) {
      console.error('Failed to export chart', err);
      alert('Failed to export chart as image.');
    }
  };

  useEffect(() => {
    if (activeTab === 'students' && selectedStudentIds.length > 0) {
      handleRunComparison();
    }
  }, [activeTab, selectedStudentIds]);

  const toggleSubject = (subName: string) => {
    setVisibleSubjects((prev) => ({
      ...prev,
      [subName]: !prev[subName],
    }));
  };

  const subjectColors = [
    '#2563eb', // Blue
    '#059669', // Emerald
    '#7c3aed', // Purple
    '#d97706', // Amber
    '#e11d48', // Rose
    '#0891b2', // Cyan
    '#4f46e5', // Indigo
    '#ea580c', // Orange
    '#16a34a', // Green
    '#9333ea', // Violet
  ];

  const getHeatmapColor = (percentage: number | null) => {
    if (percentage === null || percentage === undefined) return 'bg-slate-100 text-slate-400';
    if (percentage >= 80) return 'bg-emerald-500 text-white font-bold'; // Excellent
    if (percentage >= 60) return 'bg-blue-500 text-white font-bold'; // Good
    if (percentage >= 45) return 'bg-amber-400 text-slate-900 font-semibold'; // Needs Attention
    return 'bg-rose-500 text-white font-bold'; // Critical Deficit
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Title & Class Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs uppercase tracking-wider mb-1.5 border border-blue-200">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Core Analytics Engine
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            MOCK PERFORMANCE INTELLIGENCE
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Diagnostic progression, multi-mock cross comparisons, and individual learner trajectories
          </p>
        </div>

        {/* Global Class Filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500">Cohort Class:</span>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Basic 9 Classes</option>
            {classesList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Overall Class Trend
        </button>

        <button
          onClick={() => setActiveTab('subjects')}
          className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
            activeTab === 'subjects'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Subject Multi-Series
        </button>

        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
            activeTab === 'comparison'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Mock-to-Mock Comparison
        </button>

        <button
          onClick={() => setActiveTab('heatmap')}
          className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
            activeTab === 'heatmap'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Performance Heatmap
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
            activeTab === 'students'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Student Comparison Tool
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
            activeTab === 'alerts'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Weak Areas & Alerts
        </button>
      </div>

      {/* ==================== SUB-TAB 1: OVERALL CLASS TREND & PASS RATE ==================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overall Class Average Progression */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm relative">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Class Average Across Mocks (Section 20)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Interactive mean progression across all completed sequential mock examinations
                  </p>
                </div>
                <button
                  onClick={() => handleExportChart('class-avg-chart', 'class_average_trend')}
                  title="Export Chart"
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors dark:hover:bg-slate-800"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              <div id="class-avg-chart" className="h-72 w-full p-2 bg-white dark:bg-slate-900 rounded-lg">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={overviewKPIs?.examTrends || []}>
                    <defs>
                      <linearGradient id="colorAvgGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="examName" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px' }}
                      formatter={(val: any) => [`${val}%`, 'Class Average']}
                    />
                    <Area
                      type="monotone"
                      dataKey="average"
                      stroke="#2563eb"
                      strokeWidth={3}
                      fill="url(#colorAvgGrad)"
                      dot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pass Rate Trend (Section 30) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Cohort Pass Rate Trend (Section 30)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Percentage of candidates meeting or exceeding passing benchmark (≥ 50%)
                  </p>
                </div>
                <button
                  onClick={() => handleExportChart('pass-rate-chart', 'pass_rate_trend')}
                  title="Export Chart"
                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors dark:hover:bg-slate-800"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              <div id="pass-rate-chart" className="h-72 w-full p-2 bg-white dark:bg-slate-900 rounded-lg">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overviewKPIs?.examTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="examName" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px' }}
                      formatter={(val: any) => [`${val}%`, 'Pass Rate']}
                    />
                    <Line
                      type="monotone"
                      dataKey="passRate"
                      stroke="#059669"
                      strokeWidth={3}
                      dot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Improving vs Declining Learners Visual Breakdown (Section 31) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Learners Progression Status: Latest vs Previous Mock (Section 31)
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Categorization of cohort candidates based on delta between most recent consecutive mocks
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Improving Learners
                  </span>
                  <p className="text-3xl font-black text-emerald-900 mt-1">
                    {overviewKPIs?.improvingCount ?? 0}
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-1">Gained &gt; +1.0 percentage points</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Stable Learners
                  </span>
                  <p className="text-3xl font-black text-slate-800 mt-1">
                    {overviewKPIs?.stableCount ?? 0}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Within ±1.0 percentage points</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                  <Minus className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                    Declining Learners
                  </span>
                  <p className="text-3xl font-black text-rose-900 mt-1">
                    {overviewKPIs?.decliningCount ?? 0}
                  </p>
                  <p className="text-[11px] text-rose-700 mt-1">Dropped &lt; -1.0 percentage points</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <TrendingDown className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 2: SUBJECT MULTI-SERIES & HEALTH ==================== */}
      {activeTab === 'subjects' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Subject Performance Across Mocks (Section 21)
                </h2>
                <p className="text-xs text-slate-500">
                  Select and toggle specific curriculum subjects to isolate longitudinal trends
                </p>
              </div>
              <button
                onClick={() => handleExportChart('subject-multi-series-chart', 'subject_performance')}
                title="Export Chart"
                className="px-3 py-1.5 flex items-center gap-1.5 bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold transition-colors dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <Download className="w-4 h-4" />
                <span>Export Chart</span>
              </button>
            </div>

            {/* Subject Toggle Pills */}
            <div className="flex flex-wrap gap-2 mb-6">
              {subjectData?.subjects?.map((sub: any, idx: number) => {
                const isVis = visibleSubjects[sub.name];
                const color = subjectColors[idx % subjectColors.length];

                return (
                  <button
                    key={sub.id}
                    onClick={() => toggleSubject(sub.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                      isVis
                        ? 'text-white shadow-sm'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                    style={isVis ? { backgroundColor: color, borderColor: color } : {}}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: isVis ? '#ffffff' : color }}
                    />
                    <span>{sub.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Multi-series chart */}
            <div id="subject-multi-series-chart" className="h-80 w-full p-4 bg-white dark:bg-slate-900 rounded-xl">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={subjectData?.trends || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mockName" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px' }}
                    formatter={(val: any) => [`${val}%`]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {subjectData?.subjects?.map((sub: any, idx: number) => {
                    if (!visibleSubjects[sub.name]) return null;
                    return (
                      <Line
                        key={sub.name}
                        type="monotone"
                        dataKey={sub.name}
                        stroke={subjectColors[idx % subjectColors.length]}
                        strokeWidth={2.5}
                        dot={{ r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Subject Health Summary Table (Section 34) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Subject Health Diagnostics (Section 34)
              </h3>
              <p className="text-xs text-slate-500">
                Comparative analysis of current versus baseline averages, net series change, and trend classification
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-3 text-center">Current Mean</th>
                    <th className="py-3 px-3 text-center">Previous Mean</th>
                    <th className="py-3 px-3 text-center">Immediate Change</th>
                    <th className="py-3 px-3 text-center">Overall Series Growth</th>
                    <th className="py-3 px-3 text-center">Long-Term Diagnostic</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjectData?.subjectSummaries?.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {s.name} <span className="font-mono text-slate-400 font-normal">({s.code})</span>
                      </td>
                      <td className="py-3 px-3 text-center font-extrabold text-slate-900">
                        {s.currentAverage !== null ? `${s.currentAverage}%` : '—'}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">
                        {s.previousAverage !== null ? `${s.previousAverage}%` : '—'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {s.previousChange !== null ? (
                          <span
                            className={`font-semibold ${
                              s.previousChange > 0
                                ? 'text-emerald-600'
                                : s.previousChange < 0
                                ? 'text-rose-600'
                                : 'text-slate-600'
                            }`}
                          >
                            {s.previousChange > 0 ? `+${s.previousChange}%` : `${s.previousChange}%`}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {s.overallChange !== null ? (
                          <span
                            className={`font-bold ${
                              s.overallChange > 0
                                ? 'text-emerald-600'
                                : s.overallChange < 0
                                ? 'text-rose-600'
                                : 'text-slate-600'
                            }`}
                          >
                            {s.overallChange > 0 ? `+${s.overallChange}%` : `${s.overallChange}%`}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            s.longTermTrend === 'Improving'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.longTermTrend === 'Declining'
                              ? 'bg-rose-100 text-rose-800'
                              : s.longTermTrend === 'Stable'
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {s.longTermTrend}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 3: MOCK-TO-MOCK COMPARISON ==================== */}
      {activeTab === 'comparison' && mockComparison && (
        <div className="space-y-6">
          {/* Section 1: Overview and Gap Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Class Growth & Delta Analysis
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Percentage point shifts between consecutive mock examinations
                  </p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockComparison.deltaChartData || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', border: 'none' }}
                      formatter={(val: number) => [val > 0 ? `+${val}%` : `${val}%`, 'Point Change']}
                    />
                    <Bar
                      dataKey="change"
                      fill="#3b82f6"
                      radius={[4, 4, 4, 4]}
                      cell={(props: any, index: number) => (
                        <cell key={`cell-${index}`} fill={props.payload.change >= 0 ? '#10b981' : '#f43f5e'} />
                      )}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <AlertTriangle className="w-24 h-24 text-blue-600" />
              </div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight mb-2 relative z-10">
                Target Gap Analysis
              </h2>
              <p className="text-xs text-slate-500 mb-6 relative z-10">
                Tracking cohort progression towards the final benchmark target.
              </p>
              
              <div className="relative z-10 space-y-6">
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="font-bold text-slate-700">Latest Average</span>
                    <span className="font-black text-slate-900">{mockComparison.targetAnalysis?.latestAverage}%</span>
                  </div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="font-bold text-slate-700">Target Benchmark</span>
                    <span className="font-black text-slate-900">{mockComparison.targetAnalysis?.target}%</span>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-2 font-bold">
                    <span className="text-slate-600">Progress</span>
                    <span className="text-blue-600">{mockComparison.targetAnalysis?.gapClosed}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-1000" 
                      style={{ width: `${mockComparison.targetAnalysis?.gapClosed || 0}%` }}
                    />
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${mockComparison.targetAnalysis?.gap > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {mockComparison.targetAnalysis?.gap > 0 ? <TrendingUp className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Remaining Gap</div>
                      <div className="text-xl font-black text-slate-900">
                        {mockComparison.targetAnalysis?.gap > 0 ? `${mockComparison.targetAnalysis.gap} Points` : 'Target Reached'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Top Risers and Fallers & Subject Drivers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Top Risers & Fallers</h3>
                  <p className="text-[11px] text-slate-500">Student spotlight between latest two mocks</p>
                </div>
                <Users className="w-5 h-5 text-slate-400" />
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                {/* Risers */}
                <div className="p-0">
                  <div className="bg-emerald-50/50 p-2 text-center text-xs font-bold text-emerald-800 border-b border-emerald-100">
                    Highest Growth
                  </div>
                  <ul className="divide-y divide-slate-50">
                    {mockComparison.topRisers?.map((s: any) => (
                      <li key={s.studentId} className="p-3 flex justify-between items-center hover:bg-slate-50">
                        <span className="text-xs font-semibold text-slate-800 truncate pr-2">{s.studentName}</span>
                        <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">+{s.change}%</span>
                      </li>
                    ))}
                    {(!mockComparison.topRisers || mockComparison.topRisers.length === 0) && (
                      <li className="p-4 text-center text-xs text-slate-500">Not enough data</li>
                    )}
                  </ul>
                </div>
                {/* Fallers */}
                <div className="p-0">
                  <div className="bg-rose-50/50 p-2 text-center text-xs font-bold text-rose-800 border-b border-rose-100">
                    Needs Intervention
                  </div>
                  <ul className="divide-y divide-slate-50">
                    {mockComparison.topFallers?.map((s: any) => (
                      <li key={s.studentId} className="p-3 flex justify-between items-center hover:bg-slate-50">
                        <span className="text-xs font-semibold text-slate-800 truncate pr-2">{s.studentName}</span>
                        <span className="text-xs font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">{s.change}%</span>
                      </li>
                    ))}
                    {(!mockComparison.topFallers || mockComparison.topFallers.length === 0) && (
                      <li className="p-4 text-center text-xs text-slate-500">Not enough data</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Subject Drivers</h3>
                  <p className="text-[11px] text-slate-500">Subjects impacting the latest delta</p>
                </div>
                <Filter className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex-1 overflow-y-auto max-h-[250px] p-2">
                <ul className="space-y-1">
                  {mockComparison.subjectDrivers?.map((sub: any, idx: number) => (
                    <li key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${sub.change > 0 ? 'bg-emerald-100' : sub.change < 0 ? 'bg-rose-100' : 'bg-slate-100'}`}>
                          {sub.change > 0 ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : sub.change < 0 ? <TrendingDown className="w-4 h-4 text-rose-600" /> : <Minus className="w-4 h-4 text-slate-600" />}
                        </div>
                        <span className="text-sm font-bold text-slate-800">{sub.subjectName}</span>
                      </div>
                      <span className={`text-sm font-black ${sub.change > 0 ? 'text-emerald-600' : sub.change < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                        {sub.change > 0 ? `+${sub.change}%` : `${sub.change}%`}
                      </span>
                    </li>
                  ))}
                  {(!mockComparison.subjectDrivers || mockComparison.subjectDrivers.length === 0) && (
                    <li className="p-4 text-center text-xs text-slate-500">Not enough data</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Section 3: Grade Distribution Shift & Full Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight mb-1">Grade Distribution Shift</h3>
              <p className="text-[11px] text-slate-500 mb-6">Bell curve comparison between the latest two mocks</p>
              <div className="h-64">
                {mockComparison.gradeDistribution?.labels?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mockComparison.gradeDistribution.labels.map((label: string, i: number) => ({
                      name: label,
                      mock1: mockComparison.gradeDistribution.datasets[0]?.data[i] || 0,
                      mock2: mockComparison.gradeDistribution.datasets[1]?.data[i] || 0,
                    }))}>
                      <defs>
                        <linearGradient id="colorMock1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorMock2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Area type="monotone" name={mockComparison.gradeDistribution.datasets[0]?.label || 'Previous'} dataKey="mock1" stroke="#94a3b8" fillOpacity={1} fill="url(#colorMock1)" />
                      <Area type="monotone" name={mockComparison.gradeDistribution.datasets[1]?.label || 'Latest'} dataKey="mock2" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMock2)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">Not enough data to plot distribution</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Comparison Matrix</h3>
                  <p className="text-[11px] text-slate-500">Complete historical mock transitions</p>
                </div>
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Examination</th>
                      <th className="py-3 px-3 text-center">Mean</th>
                      <th className="py-3 px-3 text-center">Delta</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mockComparison.tableData?.map((m: any) => (
                      <tr key={m.examId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{m.examName}</td>
                        <td className="py-3 px-3 text-center font-extrabold text-slate-900">
                          {m.average !== null ? `${m.average}%` : '—'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {m.change !== null ? (
                            <span className={`font-black text-[11px] ${m.change > 0 ? 'text-emerald-600' : m.change < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                              {m.change > 0 ? `+${m.change}%` : `${m.change}%`}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {m.status === 'Improving' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800"><TrendingUp className="w-3 h-3" /> Impr</span>}
                          {m.status === 'Declining' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800"><TrendingDown className="w-3 h-3" /> Decl</span>}
                          {m.status === 'Stable' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800"><Minus className="w-3 h-3" /> Stb</span>}
                          {m.status === '—' && <span className="text-slate-400 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 4: PERFORMANCE HEATMAP ==================== */}
      {activeTab === 'heatmap' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Cohort Performance Heatmap (Section 32)
              </h2>
              <p className="text-xs text-slate-500">
                Visual matrix highlighting mastery and deficits across candidates and curriculum subjects
              </p>
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center gap-2 text-[11px]">
              <div className="flex items-center gap-1">
                <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block" />
                <span className="font-semibold text-slate-600">80–100% Excellent</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3.5 h-3.5 rounded bg-blue-500 inline-block" />
                <span className="font-semibold text-slate-600">60–79% Good</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3.5 h-3.5 rounded bg-amber-400 inline-block" />
                <span className="font-semibold text-slate-600">45–59% Attention</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3.5 h-3.5 rounded bg-rose-500 inline-block" />
                <span className="font-semibold text-slate-600">&lt;45% Critical</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider sticky top-0 z-20 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-28 sticky left-0 bg-slate-100 z-30">Index No</th>
                  <th className="py-3 px-4 min-w-[160px] sticky left-28 bg-slate-100 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                    Candidate Name
                  </th>
                  {heatmapData?.subjects?.map((sub: any) => (
                    <th key={sub.id} className="py-3 px-2 text-center min-w-[65px]">
                      {sub.code}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center bg-slate-200/80 font-black">Mean</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {heatmapData?.rows?.map((row: any) => (
                  <tr key={row.studentId} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-mono font-bold text-slate-800 sticky left-0 bg-white z-10">
                      {row.indexNumber}
                    </td>
                    <td className="py-2 px-4 font-semibold text-slate-900 sticky left-28 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] truncate">
                      {row.fullName}
                    </td>

                    {/* Subject Heatmap cells */}
                    {heatmapData?.subjects?.map((sub: any) => {
                      const p = row.scores[sub.id];
                      return (
                        <td key={sub.id} className="py-1 px-1.5 text-center">
                          <span
                            className={`inline-block w-full py-1 rounded text-[11px] ${getHeatmapColor(
                              p
                            )}`}
                          >
                            {p !== null && p !== undefined ? p : '—'}
                          </span>
                        </td>
                      );
                    })}

                    <td className="py-2 px-3 text-center font-black bg-slate-100/70 text-slate-900">
                      {row.average !== null ? `${row.average}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 5: STUDENT COMPARISON TOOL ==================== */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Multi-Candidate Head-to-Head Comparison (Section 33)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Select multiple learners to benchmark their overall mock performance and subject competencies
            </p>

            {/* Candidate checkboxes */}
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200">
              {allStudents.map((st) => {
                const isSelected = selectedStudentIds.includes(st.id);
                return (
                  <button
                    key={st.id}
                    onClick={() => {
                      setSelectedStudentIds((prev) =>
                        prev.includes(st.id) ? prev.filter((id) => id !== st.id) : [...prev, st.id]
                      );
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{st.fullName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comparative Subject Bar Chart */}
          {comparisonResults && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-900 mb-4">
                Comparative Subject Competency Breakdown
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonResults.subjectComparison || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="subjectName" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px' }}
                      formatter={(val: any) => [`${val}%`]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    {comparisonResults.students?.map((st: any, idx: number) => (
                      <Bar
                        key={st.id}
                        dataKey={st.fullName}
                        fill={subjectColors[idx % subjectColors.length]}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== SUB-TAB 6: WEAK AREAS & ACADEMIC ALERTS ==================== */}
      {activeTab === 'alerts' && weakAreasData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subjects Below Target */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Subjects Below Configured Target ({weakAreasData.target}%)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Curriculum areas where the class mean currently falls beneath the benchmark threshold
              </p>

              <div className="space-y-3">
                {weakAreasData.subjectsBelowTarget?.map((item: any) => (
                  <div
                    key={item.subjectId}
                    className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.subjectName}</h4>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Deficit: <span className="font-extrabold">-{item.deficit}%</span> below target
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-slate-900">{item.average}%</span>
                      <p className="text-[10px] text-slate-500">Current Mean</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Alerts List */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Automated Academic Performance Alerts
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Evidence-based alerts flagging consecutive mock drops and persistent deficits
              </p>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {weakAreasData.alerts?.map((alert: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                      alert.type === 'critical'
                        ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                        : alert.type === 'positive'
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                        : 'bg-amber-50/80 border-amber-200 text-amber-950'
                    }`}
                  >
                    <p className="font-bold flex items-center justify-between text-xs">
                      <span>{alert.title}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                        {alert.type}
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] opacity-90">{alert.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
