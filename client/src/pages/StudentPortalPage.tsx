import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { TrendingUp, BookOpen, Award, CheckCircle2, AlertTriangle, ArrowRight, FileText, Printer, School, BrainCircuit, Users, Target } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

export const StudentPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedExamId, setSelectedExamId] = useState('');
  const [studentResult, setStudentResult] = useState<any>(null);
  const [loadingSlip, setLoadingSlip] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchStudentData(user.id);
    }
  }, [user]);

  const fetchStudentData = async (studentId: string) => {
    try {
      setLoading(true);
      const res = await api.getStudentAnalytics(studentId);
      setData(res);
      if (res.mockTimeline?.length > 0) {
        setSelectedExamId(res.mockTimeline[res.mockTimeline.length - 1].examId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExamId && user?.id) {
      loadStudentSlip(user.id, selectedExamId);
    }
  }, [selectedExamId, user?.id]);

  const loadStudentSlip = async (studentId: string, examId: string) => {
    try {
      setLoadingSlip(true);
      const res = await api.getStudentResult(studentId, examId);
      setStudentResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSlip(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800">No Analytics Found</h2>
        <p className="text-slate-500 mt-2">Check back later after examinations have been marked.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              Student Dashboard
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome, {data.student.fullName}
            </h1>
            <p className="text-slate-300 text-sm mt-1">
              Index Number: {data.student.indexNumber}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm card-glow">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cumulative Average</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
            {data.mockTimeline?.length > 0 
              ? `${Math.round(data.mockTimeline.reduce((sum: number, m: any) => sum + (m.average || 0), 0) / data.mockTimeline.length * 10) / 10}%` 
              : 'N/A'}
          </h3>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm card-glow">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Mocks Written</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{data.mockTimeline?.length || 0}</h3>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm card-glow">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-3">
            <Award className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Best Subject</p>
          <h3 className="text-xl font-extrabold text-slate-900 mt-1 truncate">{data.bestSubject?.subjectName || 'N/A'}</h3>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 border border-indigo-400 shadow-md card-glow text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center mb-3">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-indigo-100 uppercase tracking-wider">Predicted Final BECE Agg.</p>
            <h3 className="text-2xl font-extrabold mt-1">{data.predictedAggregate || 'N/A'}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight mb-4">Performance Progression</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.mockTimeline || []}>
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
                formatter={(val: any) => [`${val}%`, 'Average']}
                contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px' }}
              />
              <Area
                type="monotone"
                dataKey="average"
                stroke="#2563eb"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorAvg)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-600" />
          Subject Intelligence & Predictions
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold text-slate-600">Subject</th>
                <th className="py-3 px-4 font-bold text-slate-600 text-center">Your Last Score</th>
                <th className="py-3 px-4 font-bold text-slate-600 text-center">Class Avg</th>
                <th className="py-3 px-4 font-bold text-indigo-600 text-center">Predicted Grade</th>
                <th className="py-3 px-4 font-bold text-slate-600">AI Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.subjectTrends?.map((sub: any) => (
                <tr key={sub.subjectId} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900">{sub.subjectName}</td>
                  <td className="py-3 px-4 text-center font-medium">
                    {sub.latestPercentage ? `${sub.latestPercentage}%` : '—'}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-500 font-medium flex items-center justify-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {sub.classAverage ? `${sub.classAverage}%` : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-block px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 font-extrabold">
                      {sub.predictedGrade || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {sub.recommendation ? (
                      <div className={`flex items-start gap-2 text-xs font-medium ${
                        sub.status === 'danger' ? 'text-rose-600' :
                        sub.status === 'warning' ? 'text-amber-600' :
                        'text-emerald-600'
                      }`}>
                        {sub.status === 'danger' || sub.status === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        )}
                        <span>{sub.recommendation}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">Need more data...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.subjectTrends?.length && (
            <p className="text-sm text-slate-500 text-center py-4">No subject data yet.</p>
          )}
        </div>
      </div>
      
      {/* Report Slip Section */}
      <div className="pt-8 mt-8 border-t border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 print:hidden">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Result Slips
          </h2>
          <div className="flex items-center gap-3">
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none"
            >
              <option value="" disabled>Select Examination</option>
              {data.mockTimeline?.map((ex: any) => (
                <option key={ex.examId} value={ex.examId}>
                  {ex.examName}
                </option>
              ))}
            </select>
            <button
              onClick={handlePrint}
              disabled={!studentResult || loadingSlip}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md shadow-blue-600/30 transition-all disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
          </div>
        </div>

        {loadingSlip ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : studentResult ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 md:p-10 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 mt-6">
            {/* Official School Header */}
            <div className="flex flex-col md:flex-row items-center justify-between pb-6 border-b-2 border-slate-900 gap-4">
              {/* Left Logo */}
              {studentResult.school?.logoUrl ? (
                <img src={studentResult.school.logoUrl} alt="School Logo Left" className="w-16 h-16 md:w-24 md:h-24 object-contain shrink-0" />
              ) : (
                <div className="w-16 h-16 md:w-24 md:h-24 shrink-0 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl">
                  <School className="w-8 h-8 md:w-10 md:h-10" />
                </div>
              )}
              
              {/* Center Text */}
              <div className="text-center flex-1 px-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-wide leading-tight">
                  {studentResult.school?.schoolName || 'Achimota Basic Model School'}
                </h1>
                <p className="text-[10px] md:text-xs text-slate-600 mt-1">
                  {studentResult.school?.address || 'P.O. Box AH 123, Achimota, Accra - Ghana'} • Tel: {studentResult.school?.telephone}
                </p>
                <p className="text-[10px] md:text-xs italic text-blue-700 font-serif mt-1">
                  "{studentResult.school?.motto || 'Excellence, Character and Innovation'}"
                </p>
                <div className="mt-3 md:mt-4 inline-block px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-slate-100 text-slate-900 font-extrabold text-[10px] md:text-xs uppercase tracking-wider border border-slate-300">
                  {studentResult.examination?.name} RESULT SLIP ({studentResult.examination?.academicYear})
                </div>
              </div>

              {/* Right Logo */}
              {studentResult.school?.logoUrl ? (
                <img src={studentResult.school.logoUrl} alt="School Logo Right" className="w-16 h-16 md:w-24 md:h-24 object-contain shrink-0 hidden md:block print:block" />
              ) : (
                <div className="w-16 h-16 md:w-24 md:h-24 shrink-0 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl hidden md:flex print:flex">
                  <School className="w-8 h-8 md:w-10 md:h-10" />
                </div>
              )}
            </div>

            {/* Student Profile Metadata Box */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 px-5 bg-slate-50 rounded-xl my-6 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Candidate Name</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {studentResult.student?.fullName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Index Number</span>
                <span className="font-mono font-extrabold text-slate-900 text-sm">
                  {studentResult.student?.indexNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Class & House</span>
                <span className="font-semibold text-slate-800">
                  {studentResult.student?.classRoom?.name || studentResult.student?.class} • {studentResult.student?.house || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Class Position</span>
                <span className="font-extrabold text-blue-700 text-sm">
                  {studentResult.summary?.position || 'N/A'}
                </span>
              </div>
            </div>

            {/* Subject Scores Table */}
            <div className="overflow-x-auto my-6 border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-3 text-center">Raw Score</th>
                    <th className="py-3 px-3 text-center">Percentage</th>
                    <th className="py-3 px-3 text-center">Grade</th>
                    <th className="py-3 px-4">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentResult.scores?.map((sc: any) => (
                    <tr key={sc.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900">{sc.subject.name}</td>
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                        {sc.rawScore !== null ? sc.rawScore : '—'}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900">
                        {sc.percentage !== null ? `${sc.percentage}%` : '—'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded font-extrabold text-xs ${
                            sc.grade === 'A'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sc.grade === 'B'
                              ? 'bg-blue-100 text-blue-800'
                              : sc.grade === 'C'
                              ? 'bg-indigo-100 text-indigo-800'
                              : sc.grade === 'D'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {sc.grade || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{sc.remark || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Performance Summary Footnotes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-blue-50/60 border border-blue-200/70 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-800 block">Overall Mean</span>
                <span className="text-xl font-black text-blue-900">
                  {studentResult.summary?.average ? `${studentResult.summary.average}%` : '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-800 block">Aggregate</span>
                <span className="text-xl font-black text-slate-900">
                  {studentResult.summary?.aggregate ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-800 block">Total Marks</span>
                <span className="text-xl font-black text-slate-900">
                  {studentResult.summary?.totalScore ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-800 block">Subjects Passed</span>
                <span className="text-xl font-black text-emerald-700">
                  {studentResult.summary?.subjectsPassed ?? 0}
                  <span className="text-xs font-normal text-slate-500">
                    {' '}
                    / {studentResult.summary?.subjectsAttempted ?? 0}
                  </span>
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-800 block">Best / Weakest</span>
                <span className="text-xs font-bold text-slate-800 block truncate">
                  Best: {studentResult.summary?.bestSubject || '—'}
                </span>
                <span className="text-[11px] text-amber-800 block truncate">
                  Weak: {studentResult.summary?.weakestSubject || '—'}
                </span>
              </div>
            </div>

            {/* Signatures */}
            <div className="mt-12 pt-8 border-t border-slate-300 flex justify-between text-xs text-slate-600">
              <div>
                <div className="w-44 border-b border-slate-400 mb-1" />
                <p className="font-semibold text-slate-900">Form Master / Mistress</p>
                <p className="text-[10px] text-slate-500 italic mt-0.5">Sign & Date</p>
              </div>
              <div className="text-right">
                <div className="w-44 border-b border-slate-400 mb-1 inline-block" />
                <p className="font-semibold text-slate-900">Head of School</p>
                <p className="text-[10px] text-slate-500 italic mt-0.5">Official Stamp & Date</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            Select an examination to view the result slip.
          </div>
        )}
      </div>
    </div>
  );
};
