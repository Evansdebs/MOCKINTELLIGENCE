import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Award,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  FileSpreadsheet,
  Download,
  BarChart2,
  Printer,
  Activity,
  BookOpen,
  Calendar,
  Clock,
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
  Area,
  AreaChart,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { BECECountdown } from '../components/dashboard/BECECountdown';

export const DashboardPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [classFilter, setClassFilter] = useState('all');
  const [classesList, setClassesList] = useState<any[]>([]);
  const [kpiData, setKpiData] = useState<any>(null);
  const [subjectTrends, setSubjectTrends] = useState<any>(null);
  const [gradeDistribution, setGradeDistribution] = useState<any>(null);
  const [weakAreas, setWeakAreas] = useState<any>(null);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [classFilter, user?.role]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      if (user?.role === 'TEACHER') {
        const [teacherRes, studentsRes, settingsRes] = await Promise.all([
          api.getTeacherDashboard(),
          api.getStudents(),
          api.getSettings(),
        ]);
        setTeacherData(teacherRes);
        if (studentsRes?.classes) {
          setClassesList(studentsRes.classes);
        }
        if (settingsRes?.settings) {
          setSettings(settingsRes.settings);
        }
      } else {
        const [kpis, subs, grades, weak, studentsRes, settingsRes] = await Promise.all([
          api.getOverview({ class: classFilter }),
          api.getSubjectTrends({ class: classFilter }),
          api.getGradeDistribution({ class: classFilter }),
          api.getWeakAreasAndAlerts({ class: classFilter }),
          api.getStudents(),
          api.getSettings(),
        ]);

        setKpiData(kpis);
        setSubjectTrends(subs);
        setGradeDistribution(grades);
        setWeakAreas(weak);
        if (studentsRes?.classes) {
          setClassesList(studentsRes.classes);
        }
        if (settingsRes?.settings) {
          setSettings(settingsRes.settings);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
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

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner & Quick Actions */}
      <div className="bg-slate-800 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Activity className="w-3.5 h-3.5" />
              Basic 9 BECE Performance Intelligence
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {getGreeting()}, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Real-time examination tracking, longitudinal multi-mock progression, and subject diagnostic analytics.
            </p>
          </div>

          {/* Quick Action Buttons (Section 65) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {isAdmin && (
              <button
                onClick={() => navigate('/examinations?new=true')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Mock</span>
              </button>
            )}
            <button
              onClick={() => navigate('/scores')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Enter Scores</span>
            </button>
            <button
              onClick={() => navigate('/analytics')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
            >
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              <span>View Analytics</span>
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Reports</span>
            </button>
          </div>
        </div>

        {/* Global Class Filter Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <span>Filter Class:</span>
            <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setClassFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  classFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Classes
              </button>
              {classesList.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setClassFilter(cls.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    classFilter === cls.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cls.name}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-400">
            Academic Year: <span className="text-white font-semibold">2025/2026</span>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <BECECountdown settings={settings} />
      </div>

      {user?.role === 'TEACHER' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm card-glow">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My Subjects</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{teacherData?.assignedSubjects?.length ?? 0}</h3>
            </div>
            
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm card-glow">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-3">
                <Award className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Score</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{teacherData?.kpis?.average ?? 0}%</h3>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm card-glow">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Pass Rate</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{teacherData?.kpis?.passRate ?? 0}%</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight mb-4">Subject Breakdown</h2>
              <div className="space-y-4">
                {teacherData?.subjectBreakdown?.map((sub: any) => (
                  <div key={sub.subjectCode} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-sm text-slate-800">{sub.subjectName}</h4>
                      <span className="text-xs font-semibold bg-white px-2 py-1 rounded-md border border-slate-200">{sub.subjectCode}</span>
                    </div>
                    <div className="flex justify-between items-center mt-3 text-xs">
                      <div>
                        <p className="text-slate-500">Average</p>
                        <p className="font-bold text-slate-900">{sub.average}%</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Pass Rate</p>
                        <p className="font-bold text-emerald-600">{sub.passRate}%</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Entries</p>
                        <p className="font-bold text-slate-900">{sub.count}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {!teacherData?.subjectBreakdown?.length && (
                  <p className="text-sm text-slate-500 text-center py-4">No data available for assigned subjects.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight mb-4">Class Performance in My Subjects</h2>
              <div className="space-y-3">
                {teacherData?.classPerformance?.map((cls: any, i: number) => (
                  <div key={cls.className} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-slate-700">{cls.className}</span>
                        <span className="font-bold text-slate-900">{cls.average}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${cls.average}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
                {!teacherData?.classPerformance?.length && (
                  <p className="text-sm text-slate-500 text-center py-4">No class performance data yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Students */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm card-glow">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Learners</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{kpiData?.totalStudents ?? '—'}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Enrolled Basic 9</p>
        </div>

        {/* Mocks Completed */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm card-glow">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mocks</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
            {kpiData?.completedMocksCount ?? 0}
            <span className="text-sm font-normal text-slate-400"> / {kpiData?.totalMocksCount ?? 5}</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Completed Mocks</p>
        </div>

        {/* Latest Average */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm card-glow">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-3">
            <Award className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Latest Average</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
            {kpiData?.latestAverage ? `${kpiData.latestAverage}%` : '—'}
          </h3>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Class-wide Mean</p>
        </div>

        {/* Pass Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm card-glow">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pass Rate</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
            {kpiData?.latestPassRate ? `${kpiData.latestPassRate}%` : '—'}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Target ≥ 50%</p>
        </div>

        {/* Improving */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm card-glow">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Improving</p>
          <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{kpiData?.improvingCount ?? 0}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Learners on the rise</p>
        </div>

        {/* Declining */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm card-glow">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
            <TrendingDown className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Declining</p>
          <h3 className="text-2xl font-extrabold text-rose-600 mt-1">{kpiData?.decliningCount ?? 0}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Needs intervention</p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Performance Progression Trend (Interactive Line Chart) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Class Performance Progression Trend
              </h2>
              <p className="text-xs text-slate-500">Mean class score across sequential mock examinations</p>
            </div>
            <Link
              to="/analytics"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Detailed View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpiData?.examTrends || []}>
                <defs>
                  <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="examName" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Class Average']}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="average"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorAvg)"
                  dot={{ r: 5, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Overall Grade Distribution
              </h2>
              <p className="text-xs text-slate-500">Aggregated letter grade distribution (A to F)</p>
            </div>
            <span className="text-xs font-medium text-slate-400">
              Total Scores: {gradeDistribution?.totalScores ?? 0}
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeDistribution?.gradeDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="grade" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${val} scores (${item.payload.percentage}%)`,
                    item.payload.remark,
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px' }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Multi-series Subject Performance Across Mocks */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Subject Performance Across All Mocks
            </h2>
            <p className="text-xs text-slate-500">
              Comparative longitudinal trajectory of core Basic 9 subjects across Mocks 1 through 5
            </p>
          </div>
          <Link
            to="/analytics?tab=subjects"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Subject Diagnostics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjectTrends?.trends || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mockName" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px' }}
                formatter={(val: any) => [`${val}%`]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {subjectTrends?.subjects?.slice(0, 6).map((sub: any, idx: number) => (
                <Bar
                  key={sub.name}
                  dataKey={sub.name}
                  fill={subjectColors[idx % subjectColors.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weak Areas & Academic Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subjects Requiring Academic Attention */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Subjects Requiring Academic Attention
              </h2>
              <p className="text-xs text-slate-500">
                Subjects with latest average falling below the target ({weakAreas?.target ?? 50}%)
              </p>
            </div>
          </div>

          {weakAreas?.subjectsBelowTarget && weakAreas.subjectsBelowTarget.length > 0 ? (
            <div className="space-y-3">
              {weakAreas.subjectsBelowTarget.map((item: any) => (
                <div
                  key={item.subjectId}
                  className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/60 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{item.subjectName}</h4>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Target Deficit: <span className="font-bold">-{item.deficit}%</span> below target
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-slate-900">{item.average}%</span>
                    <p className="text-[10px] text-slate-400">Current Mean</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">All subjects are at or above target!</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Basic 9 cohort is meeting current performance standards.</p>
            </div>
          )}
        </div>

        {/* Evidence-Based Academic Alerts */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Academic Performance Alerts
                </h2>
                <p className="text-xs text-slate-500">Automated multi-mock trajectory flags</p>
              </div>
            </div>
            <Link to="/analytics?tab=alerts" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              View All
            </Link>
          </div>

          {weakAreas?.alerts && weakAreas.alerts.length > 0 ? (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {weakAreas.alerts.slice(0, 5).map((alert: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs ${
                    alert.type === 'critical'
                      ? 'bg-rose-50/70 border-rose-200/80 text-rose-900'
                      : alert.type === 'positive'
                      ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                      : 'bg-amber-50/70 border-amber-200/80 text-amber-900'
                  }`}
                >
                  <p className="font-bold flex items-center justify-between">
                    <span>{alert.title}</span>
                    {alert.studentId && (
                      <Link
                        to={`/students/${alert.studentId}`}
                        className="underline hover:opacity-80 text-[10px]"
                      >
                        Inspect Student
                      </Link>
                    )}
                  </p>
                  <p className="mt-1 text-[11px] opacity-90 leading-relaxed">{alert.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No critical alerts currently triggered.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Mock performance patterns remain within stable boundaries.</p>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
};
