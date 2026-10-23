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
  MessageSquare,
  IdCard,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { api } from '../services/api';
import { Examination, Subject, Student } from '../types';
import { ParentDispatchModal } from '../components/ParentDispatchModal';
import { CandidateCardGenerator } from '../components/CandidateCardGenerator';

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
  const [isParentDispatchOpen, setIsParentDispatchOpen] = useState(false);
  const [isIdCardsOpen, setIsIdCardsOpen] = useState(false);

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

      // Header Logo
      if (school.logoUrl) {
        try {
          // Add logo at left margin (x: 14) and right margin (x: 176)
          doc.addImage(school.logoUrl, 'JPEG', 14, 10, 20, 20);
          doc.addImage(school.logoUrl, 'JPEG', 176, 10, 20, 20);
        } catch (e) {
          console.warn('Could not add logo to PDF:', e);
        }
      }

      // Header Text
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

        const tableHeaders = ['Rank', 'Index', 'Candidate Name', ...classData.subjects.map((s: any) => s.code), 'Mean', 'Grade', 'Agg'];
        const tableBody = classData.studentRows.map((r: any) => [
          r.rank ? `#${r.rank}` : '—',
          r.student.indexNumber,
          r.student.fullName,
          ...classData.subjects.map((s: any) => r.subjectResults[s.id]?.percentage ?? '—'),
          r.average ? `${r.average}%` : '—',
          r.overallGrade || '—',
          r.aggregate !== null ? r.aggregate : '—',
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
        doc.text(`Candidate: ${stData.student.fullName}  |  Index: ${stData.student.indexNumber}  |  Class: ${stData.student.classRoom?.name || 'N/A'}`, 14, 49);

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
        doc.text(`Overall Mean: ${stData.summary.average}%   |   Passed: ${stData.summary.subjectsPassed}   |   Aggregate: ${stData.summary.aggregate ?? '—'}   |   Position: ${stData.summary.position || 'N/A'}`, 14, finalY);

        doc.save(`${stData.student.indexNumber}_Result_Slip.pdf`);
      } else {
        // Fallback series export
        const seriesResponse = await api.getMockComparison({ class: selectedClass });
        const seriesData = seriesResponse.tableData || [];
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
        // Dynamically load ExcelJS for rich styling support
        const ExcelJS = (await import('exceljs')).default || (await import('exceljs'));
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Class Results');

        // Helper for score band styling
        const getScoreBandStyle = (percentage: number | null | undefined) => {
          if (percentage === null || percentage === undefined || isNaN(percentage)) {
            return null;
          }
          if (percentage >= 80) return { fill: '10B981', fontColor: 'FFFFFF', bold: true };
          if (percentage >= 60) return { fill: '3B82F6', fontColor: 'FFFFFF', bold: true };
          if (percentage >= 45) return { fill: 'FBBF24', fontColor: '1E293B', bold: true };
          return { fill: 'F43F5E', fontColor: 'FFFFFF', bold: true };
        };

        // 1. Sort students automatically from first to last (ranked 1, 2, 3...)
        const sortedRows = [...classData.studentRows].sort((a: any, b: any) => {
          const rankA = a.rank !== null && a.rank !== undefined ? Number(a.rank) : Infinity;
          const rankB = b.rank !== null && b.rank !== undefined ? Number(b.rank) : Infinity;
          if (rankA !== rankB) {
            return rankA - rankB;
          }
          return (b.average || 0) - (a.average || 0);
        });

        // 2. Build column definitions
        const columns: any[] = [
          { header: 'Rank', key: 'rank', width: 10 },
          { header: 'Index Number', key: 'indexNumber', width: 16 },
          { header: 'Candidate Name', key: 'candidateName', width: 28 },
          { header: 'Class', key: 'className', width: 14 },
        ];

        classData.subjects.forEach((s: any) => {
          columns.push({ header: `${s.name} (%)`, key: `score_${s.id}`, width: 14 });
          columns.push({ header: `${s.name} Grade`, key: `grade_${s.id}`, width: 14 });
        });

        columns.push(
          { header: 'Overall Average (%)', key: 'average', width: 18 },
          { header: 'Overall Grade', key: 'overallGrade', width: 14 },
          { header: 'Aggregate', key: 'aggregate', width: 12 },
          { header: 'Subjects Passed', key: 'passedCount', width: 16 }
        );

        worksheet.columns = columns;

        // Header style
        const headerRow = worksheet.getRow(1);
        headerRow.height = 26;
        headerRow.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '1E293B' },
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'CBD5E1' } },
            left: { style: 'thin', color: { argb: 'CBD5E1' } },
            bottom: { style: 'medium', color: { argb: '94A3B8' } },
            right: { style: 'thin', color: { argb: 'CBD5E1' } },
          };
        });

        // Add rows & formatting
        sortedRows.forEach((r: any) => {
          const rowData: Record<string, any> = {
            rank: r.rank ? `#${r.rank}` : '—',
            indexNumber: r.student.indexNumber,
            candidateName: r.student.fullName,
            className: r.student.classRoom?.name || 'N/A',
          };

          classData.subjects.forEach((s: any) => {
            const sc = r.subjectResults[s.id];
            rowData[`score_${s.id}`] = sc && sc.percentage !== null && sc.percentage !== undefined ? sc.percentage : '—';
            rowData[`grade_${s.id}`] = sc?.grade ?? '—';
          });

          rowData.average = r.average !== null && r.average !== undefined ? r.average : '—';
          rowData.overallGrade = r.overallGrade || '—';
          rowData.aggregate = r.aggregate !== null && r.aggregate !== undefined ? r.aggregate : '—';
          rowData.passedCount = r.passedCount !== undefined ? r.passedCount : '—';

          const addedRow = worksheet.addRow(rowData);
          addedRow.height = 22;

          addedRow.eachCell((cell) => {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
              top: { style: 'thin', color: { argb: 'E2E8F0' } },
              left: { style: 'thin', color: { argb: 'E2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
              right: { style: 'thin', color: { argb: 'E2E8F0' } },
            };
          });

          addedRow.getCell('candidateName').alignment = { vertical: 'middle', horizontal: 'left' };

          // Color subject scores
          classData.subjects.forEach((s: any) => {
            const sc = r.subjectResults[s.id];
            if (sc && sc.percentage !== null && sc.percentage !== undefined) {
              const scoreCell = addedRow.getCell(`score_${s.id}`);
              const band = getScoreBandStyle(Number(sc.percentage));
              if (band) {
                scoreCell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: band.fill },
                };
                scoreCell.font = {
                  bold: band.bold,
                  color: { argb: band.fontColor },
                };
              }
            }
          });

          // Color average
          if (r.average !== null && r.average !== undefined) {
            const avgCell = addedRow.getCell('average');
            const avgBand = getScoreBandStyle(Number(r.average));
            if (avgBand) {
              avgCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: avgBand.fill },
              };
              avgCell.font = {
                bold: avgBand.bold,
                color: { argb: avgBand.fontColor },
              };
            }
          }
        });

        // Auto-fit column widths so no values are clipped, hidden, or overlapping
        worksheet.columns.forEach((column: any) => {
          let maxLen = 0;
          if (column.header) {
            maxLen = String(column.header).length;
          }
          column.eachCell({ includeEmpty: false }, (cell: any) => {
            const val = cell.value;
            if (val !== null && val !== undefined) {
              const str = typeof val === 'object' && val.text ? String(val.text) : String(val);
              if (str.length > maxLen) {
                maxLen = str.length;
              }
            }
          });
          column.width = Math.max(maxLen + 5, 12);
        });

        // Freeze header row
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${classData.examination.name}_Results.xlsx`;
        anchor.click();
        window.URL.revokeObjectURL(url);
      } else {
        const compResponse = await api.getMockComparison({ class: selectedClass });
        const ws = XLSX.utils.json_to_sheet(compResponse.tableData || []);
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

  const handleExportWAEC = async () => {
    try {
      setGenerating(true);
      if (reportType === 'class' && selectedExamId) {
        const classData = await api.getClassResults(selectedExamId, selectedClass);
        // WAEC requires specific columns: Index, Name, Sex, and Subject codes
        const headers = ['Index Number', 'Candidate Name', 'Sex', ...classData.subjects.map((s: any) => s.code || s.name), 'Total Score', 'Total Grade', 'Aggregate'];
        
        const dataRows = classData.studentRows.map((r: any) => {
          const row: any = {
            'Index Number': r.student.indexNumber,
            'Candidate Name': r.student.fullName,
            'Sex': r.student.gender || '',
          };
          classData.subjects.forEach((s: any) => {
            // WAEC usually requires the raw mark, not percentage
            row[s.code || s.name] = r.subjectResults[s.id]?.rawScore ?? '';
          });
          row['Total Score'] = r.totalRaw !== undefined ? r.totalRaw : '';
          row['Total Grade'] = r.overallGrade || '';
          row['Aggregate'] = r.aggregate !== null ? r.aggregate : '';
          return row;
        });

        const ws = XLSX.utils.json_to_sheet(dataRows, { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "WAEC Upload");
        XLSX.writeFile(wb, `${classData.examination.name}_WAEC_Export.xlsx`);
      } else {
        alert("WAEC Export is only available for Class Master Reports.");
      }
    } catch (err: any) {
      alert('Failed to export WAEC format: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Academic Report Generation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate formal PDF publication slips, candidate desk cards, and instant parent notifications
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsIdCardsOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <IdCard className="w-4 h-4 text-blue-400" />
            <span>Candidate Desk Slips & IDs</span>
          </button>

          <button
            onClick={() => setIsParentDispatchOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Parent WhatsApp Dispatch</span>
          </button>
        </div>
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

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 flex-wrap">
          {reportType === 'class' && (
            <button
              onClick={handleExportWAEC}
              disabled={generating}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {generating ? (
                <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-amber-600" />
              )}
              <span>WAEC Export (CSV)</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            disabled={generating}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {generating ? (
              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-emerald-600" />
            )}
            <span>Export to Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={generating}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all disabled:opacity-50"
          >
            {generating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>{generating ? 'Compiling Official Report...' : 'Generate Official PDF'}</span>
          </button>
        </div>
      </div>

      {/* Parent WhatsApp & SMS Dispatch Modal */}
      <ParentDispatchModal
        isOpen={isParentDispatchOpen}
        onClose={() => setIsParentDispatchOpen(false)}
        examinationId={selectedExamId}
      />

      {/* Candidate Card and Desk Slips Generator Modal */}
      <CandidateCardGenerator
        isOpen={isIdCardsOpen}
        onClose={() => setIsIdCardsOpen(false)}
      />
    </div>
  );
};
