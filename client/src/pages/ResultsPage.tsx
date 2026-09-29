import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  Printer,
  Download,
  Award,
  CheckCircle2,
  XCircle,
  Search,
  School,
  ChevronDown,
  Table,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../services/api';
import { Examination, Student } from '../types';

export const ResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activeView, setActiveView] = useState<'slip' | 'class'>('slip');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [classesList, setClassesList] = useState<any[]>([]);

  // Result payloads
  const [studentResult, setStudentResult] = useState<any>(null);
  const [classResult, setClassResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      if (activeView === 'slip' && selectedStudentId) {
        loadStudentSlip();
      } else if (activeView === 'class') {
        loadClassResults();
      }
    }
  }, [selectedExamId, selectedStudentId, activeView, selectedClass]);

  const init = async () => {
    try {
      const [examsRes, studentsRes] = await Promise.all([
        api.getExaminations(),
        api.getStudents(),
      ]);

      const exams = examsRes.examinations || [];
      const sts = studentsRes.students || [];

      setExaminations(exams);
      setStudents(sts);
      if (studentsRes?.classes) {
        setClassesList(studentsRes.classes);
      }

      const qExam = searchParams.get('examId');
      const qStudent = searchParams.get('studentId');

      if (qExam && exams.some((e: any) => e.id === qExam)) {
        setSelectedExamId(qExam);
      } else if (exams.length > 0) {
        setSelectedExamId(exams[exams.length - 1].id);
      }

      if (qStudent && sts.some((s: any) => s.id === qStudent)) {
        setSelectedStudentId(qStudent);
      } else if (sts.length > 0) {
        setSelectedStudentId(sts[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadStudentSlip = async () => {
    if (!selectedExamId || !selectedStudentId) return;
    try {
      setLoading(true);
      const res = await api.getStudentResult(selectedStudentId, selectedExamId);
      setStudentResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadClassResults = async () => {
    if (!selectedExamId) return;
    try {
      setLoading(true);
      const res = await api.getClassResults(selectedExamId, selectedClass);
      setClassResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!classResult) return;
    
    const data = classResult.studentRows.map((row: any) => {
      const rowData: any = {
        'Rank': row.rank || '—',
        'Index No': row.student.indexNumber,
        'Candidate Name': row.student.fullName,
      };
      
      classResult.subjects.forEach((sub: any) => {
        const sc = row.subjectResults[sub.id];
        rowData[sub.code] = sc ? sc.percentage : '—';
        rowData[`${sub.code} Grade`] = sc ? sc.grade : '—';
      });
      
      rowData['Total'] = row.totalRaw !== null ? row.totalRaw : '—';
      rowData['Average'] = row.average !== null ? row.average : '—';
      rowData['Overall Grade'] = row.overallGrade || '—';
      rowData['Aggregate'] = row.aggregate !== null ? row.aggregate : '—';
      rowData['Passed'] = row.passedCount;
      
      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Class Results");
    
    XLSX.writeFile(workbook, `${classResult.examination?.name}_Results.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar (Hidden in Print) */}
      <div className="print:hidden bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveView('slip')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === 'slip' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Candidate Result Slip
            </button>
            <button
              onClick={() => setActiveView('class')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === 'class' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Class Master Results
            </button>
          </div>

          {/* Exam Selector */}
          <div>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              {examinations.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>

          {/* Student Selector (for Slip view) */}
          {activeView === 'slip' && (
            <div>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none max-w-xs"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.fullName} ({st.indexNumber})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Class Filter (for Master Class view) */}
          {activeView === 'class' && (
            <div>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="all">All Classes</option>
                {classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeView === 'class' && (
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
            >
              <Table className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          )}
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Slip</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: CANDIDATE RESULT SLIP (Section 17) */}
      {activeView === 'slip' && studentResult && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 md:p-10 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
          {/* Official School Header */}
          <div className="text-center pb-6 border-b-2 border-slate-900">
            <div className="w-12 h-12 mx-auto rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl mb-2">
              <School className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wide">
              {studentResult.school?.schoolName || 'Achimota Basic Model School'}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {studentResult.school?.address || 'P.O. Box AH 123, Achimota, Accra - Ghana'} • Tel: {studentResult.school?.telephone}
            </p>
            <p className="text-xs italic text-blue-700 font-serif mt-0.5">
              "{studentResult.school?.motto || 'Excellence, Character and Innovation'}"
            </p>
            <div className="mt-3 inline-block px-4 py-1 rounded-full bg-slate-100 text-slate-900 font-extrabold text-xs uppercase tracking-wider border border-slate-300">
              {studentResult.examination?.name} RESULT SLIP ({studentResult.examination?.academicYear})
            </div>
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
              <p className="font-semibold text-slate-800">Class Teacher's Signature</p>
            </div>
            <div className="text-right">
              <div className="w-44 border-b border-slate-400 mb-1 ml-auto" />
              <p className="font-semibold text-slate-800">
                {studentResult.school?.headteacherName || "Headteacher's Signature"}
              </p>
              <p className="text-[10px] text-slate-400">Date Generated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: MASTER CLASS RESULTS SHEET */}
      {activeView === 'class' && classResult && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                {classResult.examination?.name} — Master Class Results Sheet
              </h2>
              <p className="text-xs text-slate-500">
                Academic Year: {classResult.examination?.academicYear} • Class: {selectedClass} • Total Candidates:{' '}
                {classResult.totalStudents}
              </p>
            </div>
          </div>

          {/* Master Table */}
          <div className="overflow-x-auto max-h-[600px] border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-2 text-center w-12">Rank</th>
                  <th className="py-3 px-3 w-28">Index No</th>
                  <th className="py-3 px-4 min-w-[160px]">
                    Candidate Name
                  </th>
                  {classResult.subjects?.map((sub: any) => (
                    <th key={sub.id} className="py-3 px-3 text-center min-w-[70px]">
                      {sub.code}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center bg-slate-50/70 font-black">Total</th>
                  <th className="py-3 px-3 text-center bg-blue-50/70 font-black">Average</th>
                  <th className="py-3 px-3 text-center bg-amber-50/70 font-black">Aggregate</th>
                  <th className="py-3 px-3 text-center font-bold">Passed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classResult.studentRows?.map((row: any) => (
                  <tr key={row.student.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-2 text-center font-bold text-slate-500">
                      {row.rank ? `#${row.rank}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      {row.student.indexNumber}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900 truncate">
                      {row.student.fullName}
                    </td>

                    {classResult.subjects?.map((sub: any) => {
                      const sc = row.subjectResults[sub.id];
                      return (
                        <td key={sub.id} className="py-2.5 px-3 text-center font-medium">
                          {sc ? (
                            <span className="font-semibold text-slate-800">
                              {sc.percentage}% <span className="text-[10px] text-slate-400">({sc.grade})</span>
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-2.5 px-3 text-center bg-slate-50/50 font-bold text-slate-800">
                      {row.totalRaw !== null && row.totalRaw !== undefined ? row.totalRaw : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center bg-blue-50/50 font-black text-blue-900">
                      {row.average !== null ? `${row.average}%` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center bg-amber-50/50 font-black text-amber-900">
                      {row.aggregate !== null ? row.aggregate : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                      {row.passedCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
