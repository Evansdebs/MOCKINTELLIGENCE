import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  User,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  CheckCircle2,
  Calendar,
  BookOpen,
  Printer,
  ChevronRight,
  Sparkles,
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
} from 'recharts';
import { api } from '../services/api';

export const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');

  useEffect(() => {
    if (id) {
      loadStudentProfile(id);
    }
  }, [id]);

  const loadStudentProfile = async (studentId: string) => {
    try {
      setLoading(true);
      const res = await api.getStudentAnalytics(studentId);
      setStudentData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        Loading candidate performance intelligence...
      </div>
    );
  }

  if (!studentData?.student) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-sm font-semibold text-slate-700">Student record not found.</p>
        <button
          onClick={() => navigate('/students')}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
        >
          Return to Students
        </button>
      </div>
    );
  }

  const {
    student,
    mockTimeline,
    previousMockChange,
    overallChange,
    longTermTrend,
    bestSubject,
    weakestSubject,
    subjectTrends,
  } = studentData;

  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case 'Improving':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <TrendingUp className="w-3.5 h-3.5" /> Improving
          </span>
        );
      case 'Declining':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <TrendingDown className="w-3.5 h-3.5" /> Declining
          </span>
        );
      case 'Stable':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <Minus className="w-3.5 h-3.5" /> Stable
          </span>
        );
      case 'Fluctuating':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Sparkles className="w-3.5 h-3.5" /> Fluctuating
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
            Insufficient Data
          </span>
        );
    }
  };

  const selectedSubjectData =
    selectedSubjectId !== 'all'
      ? subjectTrends.find((s: any) => s.subjectId === selectedSubjectId)
      : null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/students')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Learners</span>
        </button>
      </div>

      {/* Candidate Profile Header Card */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-blue-500/20">
              {student.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-xs font-bold">
                  {student.indexNumber}
                </span>
                <span className="text-xs text-slate-400 font-mono">({student.studentId})</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
                  {student.class}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {student.fullName}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {student.gender} • House: {student.house || 'Unassigned'}
              </p>
            </div>
          </div>

          {/* Overall Longitudinal Trend Badge */}
          <div className="flex flex-col items-start md:items-end gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Long-Term Performance Trend
            </span>
            {getTrendBadge(longTermTrend)}
          </div>
        </div>

        {/* Metric Highlights Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Previous Mock Change
            </p>
            <p
              className={`text-xl font-extrabold mt-1 ${
                previousMockChange === null
                  ? 'text-slate-400'
                  : previousMockChange > 0
                  ? 'text-emerald-600'
                  : previousMockChange < 0
                  ? 'text-rose-600'
                  : 'text-slate-700'
              }`}
            >
              {previousMockChange === null
                ? '—'
                : `${previousMockChange > 0 ? '+' : ''}${previousMockChange}%`}
            </p>
            <p className="text-[10px] text-slate-400">Current vs Immediate Prior Mock</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Overall Series Growth
            </p>
            <p
              className={`text-xl font-extrabold mt-1 ${
                overallChange === null
                  ? 'text-slate-400'
                  : overallChange > 0
                  ? 'text-emerald-600'
                  : overallChange < 0
                  ? 'text-rose-600'
                  : 'text-slate-700'
              }`}
            >
              {overallChange === null ? '—' : `${overallChange > 0 ? '+' : ''}${overallChange}%`}
            </p>
            <p className="text-[10px] text-slate-400">Latest Mock - First Enrolled Mock</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Strongest Subject
            </p>
            <p className="text-base font-bold text-emerald-700 mt-1 truncate">
              {bestSubject ? bestSubject.subjectName : '—'}
            </p>
            <p className="text-[10px] text-slate-400">
              {bestSubject?.latestPercentage ? `${bestSubject.latestPercentage}% latest` : '—'}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Subject Needing Focus
            </p>
            <p className="text-base font-bold text-amber-700 mt-1 truncate">
              {weakestSubject ? weakestSubject.subjectName : '—'}
            </p>
            <p className="text-[10px] text-slate-400">
              {weakestSubject?.latestPercentage ? `${weakestSubject.latestPercentage}% latest` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Longitudinal Performance Timeline Chart (Section 22) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Candidate Mock Performance Trajectory
            </h2>
            <p className="text-xs text-slate-500">
              Overall percentage average achieved across sequential Basic 9 mocks
            </p>
          </div>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
            BECE Readiness Pathway
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="examName" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px' }}
                formatter={(val: any) => [`${val}%`, 'Candidate Average']}
              />
              <Line
                type="monotone"
                dataKey="average"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 6, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Individual Subject Trends (Section 23) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Subject-by-Subject Progress Breakdown
            </h2>
            <p className="text-xs text-slate-500">
              Compare learner's individual subject trajectories across the mock examination series
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Inspect Subject:</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
            >
              <option value="all">Overview Matrix</option>
              {subjectTrends.map((sub: any) => (
                <option key={sub.subjectId} value={sub.subjectId}>
                  {sub.subjectName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedSubjectData ? (
          /* Focused single subject chart */
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedSubjectData.subjectName} ({selectedSubjectData.subjectCode})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Latest Score: <span className="font-bold">{selectedSubjectData.latestPercentage}%</span> • Series Change:{' '}
                  <span className="font-bold">
                    {selectedSubjectData.overallChange !== null
                      ? `${selectedSubjectData.overallChange > 0 ? '+' : ''}${selectedSubjectData.overallChange}%`
                      : '—'}
                  </span>
                </p>
              </div>
              <div>{getTrendBadge(selectedSubjectData.trend)}</div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedSubjectData.scores}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mockName" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px' }}
                    formatter={(val: any, name: any, item: any) => [
                      `${val}% (Grade: ${item.payload.grade || '—'})`,
                      selectedSubjectData.subjectName,
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="percentage"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          /* Subject matrix table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4 text-center">Latest Mark</th>
                  <th className="py-3 px-4 text-center">Previous Change</th>
                  <th className="py-3 px-4 text-center">Series Growth</th>
                  <th className="py-3 px-4 text-center">Long-Term Trend</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjectTrends.map((sub: any) => (
                  <tr key={sub.subjectId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {sub.subjectName}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {sub.latestPercentage !== null ? `${sub.latestPercentage}%` : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {sub.previousChange !== null ? (
                        <span
                          className={`font-semibold ${
                            sub.previousChange > 0
                              ? 'text-emerald-600'
                              : sub.previousChange < 0
                              ? 'text-rose-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {sub.previousChange > 0 ? `+${sub.previousChange}%` : `${sub.previousChange}%`}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {sub.overallChange !== null ? (
                        <span
                          className={`font-semibold ${
                            sub.overallChange > 0
                              ? 'text-emerald-600'
                              : sub.overallChange < 0
                              ? 'text-rose-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {sub.overallChange > 0 ? `+${sub.overallChange}%` : `${sub.overallChange}%`}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">{getTrendBadge(sub.trend)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedSubjectId(sub.subjectId)}
                        className="text-xs text-blue-600 font-semibold hover:underline"
                      >
                        Inspect Line
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick link to result slips for each exam */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-3">View Examination Result Slips</h3>
        <div className="flex flex-wrap gap-2.5">
          {mockTimeline.map((exam: any) => (
            <Link
              key={exam.examId}
              to={`/results?examId=${exam.examId}&studentId=${student.id}`}
              className="px-3.5 py-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-700 flex items-center gap-1.5 transition-all"
            >
              <Award className="w-3.5 h-3.5 text-blue-600" />
              <span>{exam.examName} Result Slip</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
