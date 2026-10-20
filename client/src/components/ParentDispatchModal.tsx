import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Phone,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Users,
  Search,
  Filter,
  Check,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { Examination, Student } from '../types';
import { SectionSkeleton } from './LoadingStates';

interface ParentDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  examinationId?: string;
}

export const ParentDispatchModal: React.FC<ParentDispatchModalProps> = ({
  isOpen,
  onClose,
  examinationId,
}) => {
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [selectedExamId, setSelectedExamId] = useState(examinationId || '');
  const [classesList, setClassesList] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [customGreeting, setCustomGreeting] = useState('Dear Parent/Guardian');
  const [loading, setLoading] = useState(false);
  const [sendingIndex, setSendingIndex] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sentRecords, setSentRecords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      init();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedExamId) {
      loadStudentsResults();
    }
  }, [selectedExamId, selectedClass]);

  const init = async () => {
    try {
      setLoading(true);
      const [exRes, clsRes] = await Promise.all([
        api.getExaminations(),
        api.getClassRooms(),
      ]);
      const exams = exRes.examinations || [];
      setExaminations(exams);
      if (clsRes) {
        setClassesList(Array.isArray(clsRes) ? clsRes : clsRes.classes || []);
      }
      if (!selectedExamId && exams.length > 0) {
        setSelectedExamId(exams[exams.length - 1].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsResults = async () => {
    if (!selectedExamId) return;
    try {
      setLoading(true);
      const res = await api.getClassResults(selectedExamId, selectedClass !== 'all' ? selectedClass : undefined);
      const studentRows = res.studentRows || [];
      setStudents(studentRows);
      // Select all by default
      setSelectedStudentIds(studentRows.map((r: any) => r.student.id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((r) => r.student.id));
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const generateParentMessage = (row: any) => {
    const examName = examinations.find((e) => e.id === selectedExamId)?.name || 'BECE Mock Exam';
    const st = row.student;
    const scores = row.subjectResults || {};
    
    // Core summary lines
    const subjectsSummary = Object.values(scores)
      .slice(0, 5)
      .map((s: any) => `• ${s.subject?.name || s.subjectName || 'Subject'}: ${s.percentage}% (Grade ${s.grade || '—'})`)
      .join('\n');

    return (
      `*${examName.toUpperCase()} RESULT NOTIFICATION*\n\n` +
      `${customGreeting},\n` +
      `Here is the official performance report for *${st.fullName}* (Index: ${st.indexNumber}):\n\n` +
      `📊 *Overall Performance:*\n` +
      `• Total Average: *${row.average}%*\n` +
      `• Overall Grade: *${row.overallGrade || '—'}*\n` +
      `• BECE Aggregate: *${row.aggregate !== null ? row.aggregate : '—'}*\n` +
      (row.rank ? `• Class Position: *#${row.rank} of ${students.length}*\n\n` : `\n`) +
      `📚 *Core Subject Highlights:*\n` +
      `${subjectsSummary}\n\n` +
      `⚠️ *Action Required:*\n` +
      `Please review this mock result with your ward to identify key areas of study before the upcoming BECE final examinations.\n\n` +
      `_Issued by Academic Administration • Onereal Mock Performance Intelligence_`
    );
  };

  const handleCopyMessage = (row: any) => {
    const text = generateParentMessage(row);
    navigator.clipboard.writeText(text);
    setCopiedId(row.student.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSendWhatsApp = (row: any, phone = '') => {
    const message = generateParentMessage(row);
    const encoded = encodeURIComponent(message);
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    
    window.open(url, '_blank');
    setSentRecords((prev) => ({ ...prev, [row.student.id]: true }));
  };

  const handleSendSMS = (row: any, phone = '') => {
    const message = generateParentMessage(row);
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;
    window.open(url, '_self');
    setSentRecords((prev) => ({ ...prev, [row.student.id]: true }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Parent WhatsApp & SMS Dispatch Center
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                  Verified Delivery
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instantly transmit structured mock results, aggregate, and subject marks to parents
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Examination
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
            >
              {examinations.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Class Cohort
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
            >
              <option value="all">All Classes</option>
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Greeting Salutation
            </label>
            <input
              type="text"
              value={customGreeting}
              onChange={(e) => setCustomGreeting(e.target.value)}
              placeholder="e.g. Dear Parent/Guardian"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
            />
          </div>
        </div>

        {/* Action Quick Bar */}
        <div className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs font-semibold mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-1.5 font-bold"
            >
              {selectedStudentIds.length === students.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600 dark:text-slate-300">
              {selectedStudentIds.length} of {students.length} candidates ready for dispatch
            </span>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Ready for 1-Click WhatsApp & SMS</span>
          </div>
        </div>

        {/* Students Dispatch Table */}
        <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
          {loading ? (
            <SectionSkeleton type="table" rows={6} title="Formatting Candidate WhatsApp Reports..." />
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No candidates found for this examination or class filter.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.length === students.length && students.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded text-blue-600 focus:ring-0"
                    />
                  </th>
                  <th className="py-2.5 px-3">Candidate</th>
                  <th className="py-2.5 px-3">Index No</th>
                  <th className="py-2.5 px-2 text-center">Average</th>
                  <th className="py-2.5 px-2 text-center">Aggregate</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Instant Dispatch Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((r: any) => {
                  const isSelected = selectedStudentIds.includes(r.student.id);
                  const isSent = sentRecords[r.student.id];

                  return (
                    <tr
                      key={r.student.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-blue-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectStudent(r.student.id)}
                          className="rounded text-blue-600 focus:ring-0"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900 dark:text-white">{r.student.fullName}</p>
                        <p className="text-[10px] text-slate-400">{r.student.classRoom?.name || 'Basic 9'}</p>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-600 dark:text-slate-400">
                        {r.student.indexNumber}
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-blue-600">
                        {r.average}%
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-amber-600">
                        {r.aggregate !== null ? r.aggregate : '—'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isSent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3" /> Dispatched
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5">
                        <button
                          onClick={() => handleCopyMessage(r)}
                          title="Copy Formatted WhatsApp Message"
                          className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          {copiedId === r.student.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>Copy</span>
                        </button>

                        <button
                          onClick={() => handleSendWhatsApp(r)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          onClick={() => handleSendSMS(r)}
                          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>SMS</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            Messages automatically format candidates' subject breakdown, aggregate, and class ranking for WhatsApp & SMS.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
