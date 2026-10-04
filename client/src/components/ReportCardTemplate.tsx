import React from 'react';
import { User, BookOpen, Trophy, BarChart3, BrainCircuit, Lightbulb, School } from 'lucide-react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

interface ReportCardTemplateProps {
  data: any;
  chartData?: any[];
  remedialSubjects?: any[];
}

export const ReportCardTemplate: React.FC<ReportCardTemplateProps> = ({ data, chartData, remedialSubjects }) => {
  if (!data) return null;

  const { student, school, examination, summary, scores } = data;

  return (
    <div className="w-[800px] bg-white text-slate-800 font-sans mx-auto overflow-hidden print:w-full print:shadow-none relative" id="report-card-export">
      
      {/* Top Background Curve (Approximation) */}
      <div className="absolute top-0 right-0 w-96 h-32 bg-[#eab308] rounded-bl-full opacity-20 pointer-events-none" />

      {/* 1. Header Section */}
      <div className="px-8 pt-6 pb-2 flex items-center justify-between relative z-10">
        {/* Logo */}
        <div className="w-20 h-24 shrink-0 flex items-center justify-center bg-transparent">
          {school?.logoUrl ? (
            <img src={school.logoUrl} alt="Logo" className="w-full h-full object-contain drop-shadow-sm" />
          ) : (
            <School className="w-12 h-12 text-[#1e3a8a]" />
          )}
        </div>
        
        {/* School Info */}
        <div className="flex-1 text-center px-4">
          <h1 className="text-3xl font-black text-[#1e3a8a] tracking-tight mb-1 font-serif">
            {school?.schoolName || 'ACHIMOTA BASIC MODEL SCHOOL'}
          </h1>
          <p className="text-sm font-bold text-slate-800">
            {school?.address || 'P.O. Box 123, Achimota - Accra, Ghana'}
          </p>
          <p className="text-sm font-bold text-slate-800">
            Tel: {school?.telephone || '0302 123 456'}
          </p>
          <p className="text-[13px] italic font-serif text-[#1e3a8a] mt-2 font-bold tracking-widest">
            {school?.motto || 'Discipline • Knowledge • Excellence'}
          </p>
        </div>
      </div>

      {/* 2. Banner */}
      <div className="bg-[#1e3a8a] text-white px-8 py-2 mx-6 rounded-lg flex items-center justify-between shadow-sm relative overflow-hidden">
        {/* Banner accents */}
        <div className="absolute -left-4 -top-4 w-12 h-12 bg-white opacity-10 rounded-full" />
        <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-[#eab308] opacity-20 rounded-full" />
        
        <div className="relative z-10">
          <h2 className="text-2xl font-black tracking-widest uppercase text-white">CANDIDATE RESULT SLIP</h2>
          <p className="text-blue-200 font-bold text-[11px] tracking-widest uppercase mt-0.5 text-center">
            {examination?.name || 'MOCK 1'} - {examination?.academicYear || '2024/2025'}
          </p>
        </div>
        <div className="text-right relative z-10">
          <p className="text-[10px] text-blue-200 font-medium">Date Generated:</p>
          <p className="font-bold text-[11px]">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="px-6 py-2 space-y-2">
        
        {/* 3. Candidate Profile */}
        <div className="border border-blue-200 rounded-xl overflow-hidden relative bg-[#f8fafc]">
          {/* Faint Watermark */}
          {school?.logoUrl && (
            <div className="absolute top-1/2 left-2/3 -translate-y-1/2 -translate-x-1/2 opacity-5 pointer-events-none w-64 h-64 grayscale">
              <img src={school.logoUrl} className="w-full h-full object-contain" alt="Watermark" />
            </div>
          )}

          <div className="bg-transparent px-4 py-1.5 border-b border-blue-200 flex items-center gap-2">
            <User className="w-4 h-4 text-[#1e3a8a]" />
            <h3 className="font-bold text-[#1e3a8a] tracking-wider uppercase text-sm">CANDIDATE PROFILE</h3>
          </div>
          <div className="px-4 py-2 grid grid-cols-[1fr_200px] gap-x-4 gap-y-1.5 relative z-10">
            <div className="space-y-1.5">
              <div className="flex">
                <span className="w-32 font-bold text-[#1e3a8a] text-sm">Name:</span>
                <span className="font-bold text-slate-800 text-sm">{student?.fullName}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-[#1e3a8a] text-sm">Index Number:</span>
                <span className="font-bold text-slate-800 text-sm">{student?.indexNumber}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-[#1e3a8a] text-sm">Class & House:</span>
                <span className="font-bold text-slate-800 text-sm">
                  {student?.classRoom?.name || student?.class} • {student?.house || 'N/A'}
                </span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-[#1e3a8a] text-sm">Class Position:</span>
                <span className="font-bold text-slate-800 text-sm">{summary?.position || 'N/A'}</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center transform -rotate-12 opacity-80 pt-2">
              <span className="block font-serif italic text-[22px] text-[#1e3a8a] leading-tight text-center font-bold">Great</span>
              <span className="block font-serif italic text-[22px] text-[#1e3a8a] leading-tight text-center font-bold">Students</span>
              <span className="block font-serif italic text-[22px] text-[#1e3a8a] leading-tight text-center font-bold">Build</span>
              <span className="block font-serif italic text-[22px] text-[#1e3a8a] leading-tight text-center font-bold">Great Futures</span>
            </div>
          </div>
        </div>

        {/* 4. Subject Scores */}
        <div className="border border-blue-200 rounded-xl overflow-hidden">
          <div className="bg-[#1e3a8a] text-white px-4 py-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <h3 className="font-bold tracking-wider uppercase text-sm">SUBJECT SCORES</h3>
          </div>
          <table className="w-full text-[13px]">
            <thead className="bg-[#f1f5f9] text-[#1e3a8a] font-bold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-1.5 px-4 text-center w-10 border-b border-blue-200 border-r border-white">#</th>
                <th className="py-1.5 px-4 text-left border-b border-blue-200 border-r border-white">SUBJECT</th>
                <th className="py-1.5 px-4 text-center border-b border-blue-200 border-r border-white">RAW SCORE</th>
                <th className="py-1.5 px-4 text-center border-b border-blue-200 border-r border-white">PERCENTAGE (%)</th>
                <th className="py-1.5 px-4 text-center border-b border-blue-200 border-r border-white">GRADE</th>
                <th className="py-1.5 px-4 text-center border-b border-blue-200">REMARK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {scores?.map((sc: any, index: number) => {
                const isEven = index % 2 === 0;
                let gradeColor = 'bg-slate-200 text-slate-700';
                if (sc.grade?.startsWith('A')) gradeColor = 'bg-[#1e3a8a] text-white';
                else if (sc.grade?.startsWith('B')) gradeColor = 'bg-[#22c55e] text-white';
                else if (sc.grade?.startsWith('C')) gradeColor = 'bg-[#eab308] text-white';
                else if (sc.grade?.startsWith('D') || sc.grade?.startsWith('E')) gradeColor = 'bg-[#f97316] text-white';
                else if (sc.grade?.startsWith('F')) gradeColor = 'bg-[#dc2626] text-white';

                return (
                  <tr key={index} className={isEven ? 'bg-white' : 'bg-slate-50/70'}>
                    <td className="py-1 px-4 font-bold text-slate-500 text-center border-r border-white">{index + 1}</td>
                    <td className="py-1 px-4 font-bold text-slate-800 border-r border-white">{sc.subject?.name}</td>
                    <td className="py-1 px-4 text-center font-bold text-slate-700 border-r border-white">
                      {sc.rawScore} <span className="text-slate-400 font-normal text-xs">/ 100</span>
                    </td>
                    <td className="py-1 px-4 text-center font-bold text-slate-700 border-r border-white">
                      {sc.percentage ? `${sc.percentage}.00%` : '-'}
                    </td>
                    <td className="py-1 px-4 text-center border-r border-white">
                      <span className={`inline-block px-3 py-0.5 rounded font-black text-xs min-w-[36px] ${gradeColor}`}>
                        {sc.grade || '-'}
                      </span>
                    </td>
                    <td className="py-1 px-4 text-center font-bold text-slate-700">{sc.remark || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 5. Two Columns: Summary & Chart */}
        <div className="grid grid-cols-[45%_1fr] gap-4">
          
          {/* Left: Summary */}
          <div className="border border-blue-200 rounded-xl overflow-hidden flex flex-col">
            <div className="bg-[#1e3a8a] text-white px-4 py-1.5 flex items-center gap-2 shrink-0">
              <Trophy className="w-4 h-4" />
              <h3 className="font-bold tracking-wider uppercase text-sm">PERFORMANCE SUMMARY</h3>
            </div>
            <div className="p-3 flex flex-col gap-2 flex-1 bg-[#f8fafc]">
              <div className="flex justify-between items-center border-b border-blue-100 pb-1">
                <span className="font-bold text-[#1e3a8a] text-[13px]">Overall Total Marks:</span>
                <span className="font-black text-slate-800 text-[13px]">{summary?.totalScore} <span className="text-slate-400 font-normal">/ {(scores?.length || 0) * 100}</span></span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                <span className="font-bold text-[#1e3a8a] text-[13px]">Overall Mean:</span>
                <span className="font-black text-slate-800 text-[13px]">{summary?.average ? `${summary.average}.00%` : '-'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                <span className="font-bold text-[#1e3a8a] text-[13px]">Subjects Passed vs Attempted:</span>
                <span className="font-black text-slate-800 text-[13px]">{summary?.subjectsPassed} / {summary?.subjectsAttempted}</span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                <span className="font-bold text-[#1e3a8a] text-[13px]">Best Subject:</span>
                <span className="font-bold text-slate-800 text-[13px] truncate max-w-[120px] text-right">{summary?.bestSubject || '-'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                <span className="font-bold text-[#1e3a8a] text-[13px]">Weakest Subject:</span>
                <span className="font-bold text-slate-800 text-[13px] truncate max-w-[120px] text-right">{summary?.weakestSubject || '-'}</span>
              </div>
              <div className="flex justify-between items-center mt-auto">
                <span className="font-bold text-[#1e3a8a] text-[13px]">Projected Final BECE Aggregate:</span>
                <span className="font-black text-lg text-slate-900">{summary?.aggregate || '-'}</span>
              </div>
            </div>
          </div>

          {/* Right: Chart */}
          <div className="border border-blue-200 rounded-xl overflow-hidden flex flex-col">
            <div className="bg-[#1e3a8a] text-white px-4 py-1.5 flex items-center gap-2 shrink-0">
              <BarChart3 className="w-4 h-4" />
              <div className="flex items-center gap-2">
                <h3 className="font-bold tracking-wider uppercase text-sm leading-tight">PERFORMANCE TRAJECTORY</h3>
                <span className="text-[10px] text-blue-200 font-medium">(Last 4 Mocks)</span>
              </div>
            </div>
            <div className="p-2 bg-white h-full w-full flex items-center justify-center min-h-[160px]">
              {chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="mockName" 
                      tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fontSize: 9, fill: '#64748b' }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <Tooltip cursor={{fill: '#f1f5f9'}} />
                    <Legend iconType="square" wrapperStyle={{ fontSize: 9, fontWeight: 'bold' }} />
                    
                    {Object.keys(chartData[0]).filter(k => k !== 'mockName' && k !== 'mockDate').map((key, i) => {
                      const colors = ['#3b82f6', '#eab308', '#22c55e', '#8b5cf6', '#f43f5e', '#06b6d4'];
                      return (
                        <Bar 
                          key={key} 
                          dataKey={key} 
                          fill={colors[i % colors.length]} 
                          radius={[0, 0, 0, 0]}
                          barSize={8}
                          isAnimationActive={false}
                        />
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400 text-xs font-semibold">Not enough historical data.</p>
              )}
            </div>
          </div>

        </div>

        {/* 6. AI Insights */}
        {remedialSubjects && remedialSubjects.length > 0 && (
          <div className="border border-rose-200 rounded-xl overflow-hidden bg-[#fff1f2] flex mt-2">
            <div className="bg-[#1e3a8a] text-white p-2 flex flex-col items-center justify-center w-28 shrink-0 relative overflow-hidden">
              <BrainCircuit className="w-6 h-6 mb-1 relative z-10" />
              <span className="text-[9px] font-bold text-center leading-tight uppercase relative z-10">AI INSIGHTS &<br/>REMEDIAL ALERTS</span>
              <div className="absolute inset-0 bg-[#eab308] opacity-10" />
            </div>
            <div className="flex-1 p-2 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-[#1e3a8a] text-[11px] mb-2 uppercase">Weakness Identification & Recommended Actions</h4>
                <div className="space-y-1">
                  {remedialSubjects.slice(0,3).map((sub, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-rose-600 font-bold mt-0.5 text-[10px]">⚠️</span>
                      <p className="text-[11px] text-slate-700 leading-tight">
                        <strong className="text-[#1e3a8a]">{sub.subjectName}:</strong> {sub.recommendation || 'Needs immediate attention. Focus on problem solving.'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="w-64 p-2 bg-[#eff6ff] border-l border-blue-100 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 mb-1 text-[#1e3a8a]">
                  <Lightbulb className="w-4 h-4" />
                  <h5 className="font-bold text-[11px]">Suggested Actions</h5>
                </div>
                <ul className="text-[10px] text-slate-700 space-y-1 list-none pl-1">
                  <li className="flex items-start gap-1.5"><span className="text-[#1e3a8a]">✓</span> Set a focused study plan.</li>
                  <li className="flex items-start gap-1.5"><span className="text-[#1e3a8a]">✓</span> Use past questions for practice.</li>
                  <li className="flex items-start gap-1.5"><span className="text-[#1e3a8a]">✓</span> Attend extra lessons or seek help.</li>
                  <li className="flex items-start gap-1.5"><span className="text-[#1e3a8a]">✓</span> Keep up the good work in others!</li>
                </ul>
            </div>
          </div>
        )}

      </div>

      {/* 7. Signatures & Footer */}
      <div className="px-10 mt-2 pb-1">
        <div className="flex justify-between items-end mb-2">
          <div className="w-56">
            <div className="flex items-center gap-2 mb-1 border-b border-[#1e3a8a] pb-1">
              <span className="text-[#1e3a8a]">✍️</span>
              {/* Teacher Signature Placeholder */}
            </div>
            <p className="font-bold text-[#1e3a8a] text-[11px]">Class Teacher's Signature</p>
            
            <div className="border-b border-[#1e3a8a] pb-1 mt-4" />
            <div className="flex items-center justify-between">
              <p className="font-bold text-[#1e3a8a] text-[11px] mt-1">Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="w-64 text-center relative flex flex-col items-center">
            {school?.headteacherSignature ? (
              <img 
                src={school.headteacherSignature} 
                className="h-12 object-contain absolute bottom-10"
                alt="Signature"
              />
            ): (
              <div className="h-16 absolute bottom-12 w-full font-serif italic text-3xl text-slate-300 pointer-events-none opacity-50 flex items-center justify-center">Sign Here</div>
            )}
            <div className="border-b border-[#1e3a8a] w-full" />
            <p className="font-bold text-[#1e3a8a] text-[11px] mt-1">Headteacher / Principal</p>
            <p className="text-[11px] font-bold text-slate-800 mt-0.5">{school?.headteacherName || 'Mr. Samuel Ofori-Atta'}</p>
          </div>
        </div>
        
        <div className="text-center mt-2 relative pt-2 pb-2">
           <div className="absolute top-0 left-0 w-full h-[1px] bg-slate-200" />
           <p className="font-serif italic font-bold text-[#1e3a8a] text-sm tracking-wide">Together We Build a Brighter Future</p>
        </div>
      </div>
      
      {/* Bottom accent bar */}
      <div className="h-4 bg-[#1e3a8a] w-full absolute bottom-0 left-0" />
      <div className="h-1 bg-[#eab308] w-full absolute bottom-4 left-0" />
    </div>
  );
};
