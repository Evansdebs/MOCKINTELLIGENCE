import React, { useState, useEffect } from 'react';
import {
  Printer,
  Download,
  FileText,
  Award,
  CheckCircle2,
  BookOpen,
  Calendar,
  School,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { api } from '../services/api';
import { Examination, Subject, Student } from '../types';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<'class' | 'student' | 'subject' | 'series'>('class');
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);

  // Selection
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const [exRes, stRes, subRes] = await Promise.all([
        api.getExaminations(),
        api.getStudents(),
        api.getSubjects(),
      ]);

      const exams = exRes.examinations || [];
      const sts = stRes.students || [];
      const subs = subRes.subjects || [];

      setExaminations(exams);
      setStudents(sts);
      setSubjects(subs);
      if (stRes?.classes) setClassesList(stRes.classes);

      if (exams.length > 0) setSelectedExamId(exams[exams.length - 1].id);
      if (sts.length > 0) setSelectedStudentId(sts[0].id);
      if (subs.length > 0) setSelectedSubjectId(subs[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportPDF = async () => {
    try {
      setGenerating(true);
      const settingsRes = await api.getSettings();
      const school = settingsRes.settings || { schoolName: 'Achimota Basic Model School' };

      const doc = new jsPDF();

      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(school.schoolName.toUpperCase(), 105, 18, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(school.address || 'P.O. Box AH 123, Achimota, Accra - Ghana', 105, 24, { align: 'center' });
      doc.text(`Academic Year: ${school.academicYear} • Class: Basic 9`, 105, 30, { align: 'center' });

      doc.setLineWidth(0.5);
      doc.line(14, 34, 196, 34);

      if (reportType === 'class' && selectedExamId) {
        const classData = await api.getClassResults(selectedExamId, selectedClass);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(`${classData.examination.name} — Class Examination Report`, 14, 42);

        const tableHeaders = ['Rank', 'Index', 'Candidate Name', ...classData.subjects.map((s: any) => s.code), 'Mean'];
        const tableBody = classData.studentRows.map((r: any) => [
          r.rank ? `#${r.rank}` : '—',
          r.student.indexNumber,
          r.student.fullName,
          ...classData.subjects.map((s: any) => r.subjectResults[s.id]?.percentage ?? '—'),
          r.average ? `${r.average}%` : '—',
        ]);

        autoTable(doc, {
          startY: 48,
          head: [tableHeaders],
          body: tableBody,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [37, 99, 235] },
        });

        doc.save(`${classData.examination.name}_Class_Report.pdf`);
      } else if (reportType === 'student' && selectedStudentId && selectedExamId) {
        const stData = await api.getStudentResult(selectedStudentId, selectedExamId);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(`Official Mock Result Slip — ${stData.examination.name}`, 14, 42);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Candidate: ${stData.student.fullName}  |  Index: ${stData.student.indexNumber}  |  Class: ${stData.student.class}`, 14, 49);

        const body = stData.scores.map((sc: any) => [
          sc.subject.name,
          sc.rawScore ?? '—',
          sc.percentage ? `${sc.percentage}%` : '—',
          sc.grade ?? '—',
          sc.remark ?? '—',
        ]);

        autoTable(doc, {
          startY: 55,
          head: [['Subject', 'Raw Score', 'Percentage', 'Grade', 'Remark']],
          body,
          headStyles: { fillColor: [37, 99, 235] },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFont('helvetica', 'bold');
        doc.text(`Overall Mean: ${stData.summary.average}%   |   Passed: ${stData.summary.subjectsPassed}   |   Position: ${stData.summary.position || 'N/A'}`, 14, finalY);

        doc.save(`${stData.student.indexNumber}_Result_Slip.pdf`);
      } else {
        // Fallback series export
        const seriesData = await api.getMockComparison({ class: selectedClass });
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Basic 9 Sequential Mock Progression Report', 14, 42);

        const body = seriesData.map((m: any) => [
          m.examName,
          `#${m.sequenceOrder}`,
          m.studentCount,
          m.average ? `${m.average}%` : '—',
          m.change ? `${m.change > 0 ? '+' : ''}${m.change}%` : '—',
          m.status,
        ]);

        autoTable(doc, {
          startY: 48,
          head: [['Examination', 'Sequence', 'Candidates', 'Class Mean', 'Change', 'Status']],
          body,
          headStyles: { fillColor: [37, 99, 235] },
        });

        doc.save('Basic9_Mock_Progression_Report.pdf');
      }
    } catch (err: any) {
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setGenerating(true);
      if (reportType === 'class' && selectedExamId) {
        const classData = await api.getClassResults(selectedExamId, selectedClass);
        const rows = classData.studentRows.map((r: any) => {
          const item: any = {
            Rank: r.rank ? `#${r.rank}` : '—',
            'Index Number': r.student.indexNumber,
            'Candidate Name': r.student.fullName,
            Class: r.student.class,
          };
          classData.subjects.forEach((s: any) => {
            item[s.name] = r.subjectResults[s.id]?.percentage ?? '';
          });
          item['Overall Average (%)'] = r.average;
          item['Subjects Passed'] = r.passedCount;
          return item;
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Class Results');
        XLSX.writeFile(wb, `${classData.examination.name}_Results.xlsx`);
      } else {
        const comp = await api.getMockComparison({ class: selectedClass });
        const ws = XLSX.utils.json_to_sheet(comp);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Mock Comparison');
        XLSX.writeFile(wb, 'Mock_Series_Analytics.xlsx');
      }
    } catch (err: any) {
      alert('Failed to export Excel: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Academic Report Generation
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate formal PDF publication slips and Excel analytic matrices for candidates and management
        </p>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setReportType('class')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            reportType === 'class'
              ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold mb-3">
            <School className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Class Master Report</h3>
          <p className="text-xs text-slate-500 mt-1">
            Complete ranking and subject score distribution across the class
          </p>
        </button>

        <button
          onClick={() => setReportType('student')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            reportType === 'student'
              ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold mb-3">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Candidate Result Slip</h3>
          <p className="text-xs text-slate-500 mt-1">
            Individual official slip with marks, grades, remarks and positions
          </p>
        </button>

        <button
          onClick={() => setReportType('series')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            reportType === 'series'
              ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-3">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Mock Series Progression</h3>
          <p className="text-xs text-slate-500 mt-1">
            Longitudinal multi-mock comparative analysis from Mock 1 to Mock 5
          </p>
        </button>
      </div>

      {/* Parameters Configuration Box */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm max-w-2xl space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
          Report Parameters
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Examination
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              {examinations.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cohort Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Classes</option>
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {reportType === 'student' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Candidate Name
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.fullName} ({st.indexNumber}) — {st.classRoom?.name || st.class}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={handleExportExcel}
            disabled={generating}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export to Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={generating}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>{generating ? 'Compiling Report...' : 'Generate Official PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
