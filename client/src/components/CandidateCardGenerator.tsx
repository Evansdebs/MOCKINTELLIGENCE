import React, { useState, useEffect } from 'react';
import {
  IdCard,
  Printer,
  Download,
  School,
  QrCode,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import { Student, SchoolSettings } from '../types';
import { SectionSkeleton } from './LoadingStates';

interface CandidateCardGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CandidateCardGenerator: React.FC<CandidateCardGeneratorProps> = ({
  isOpen,
  onClose,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [cardLayout, setCardLayout] = useState<'idcard' | 'deskslip'>('deskslip');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, selectedClass]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (selectedClass !== 'all') {
        params.class = selectedClass;
      }
      const [stRes, setRes] = await Promise.all([
        api.getStudents(params),
        api.getSettings(),
      ]);
      setStudents(stRes.students || []);
      if (stRes.classes) {
        setClassesList(stRes.classes);
      }
      if (setRes.settings) {
        setSchoolSettings(setRes.settings);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(
    (st) =>
      st.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.indexNumber.includes(searchQuery) ||
      st.studentId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col print:p-0 print:border-none print:shadow-none print:max-h-none print:fixed print:inset-0 print:bg-white">
        {/* Modal Controls (Hidden in Print) */}
        <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <IdCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Candidate ID Cards & Exam Desk Slips
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                  WAEC / OMR Verified
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate printable examination identification cards and table desk slips with verification codes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Layout switch */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setCardLayout('deskslip')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  cardLayout === 'deskslip'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Desk Slips (4 per page)
              </button>
              <button
                onClick={() => setCardLayout('idcard')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  cardLayout === 'idcard'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                ID Cards (Badge size)
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print All Slips</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter Bar (Hidden in Print) */}
        <div className="print:hidden flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or index..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
            >
              <option value="all">All Classes</option>
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">
              {filteredStudents.length} Candidates
            </span>
          </div>
        </div>

        {/* Printable Slips Canvas Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100 dark:bg-slate-950 rounded-2xl print:bg-white print:p-0 print:overflow-visible">
          {loading ? (
            <SectionSkeleton type="grid" title="Rendering candidate desk slips & ID barcodes..." />
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No candidates match criteria for card generation.
            </div>
          ) : (
            <div
              className={`grid ${
                cardLayout === 'deskslip'
                  ? 'grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-4'
                  : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-3'
              }`}
            >
              {filteredStudents.map((st) => (
                <div
                  key={st.id}
                  className={`bg-white text-slate-900 border-2 border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between break-inside-avoid relative overflow-hidden ${
                    cardLayout === 'deskslip' ? 'h-52' : 'h-64'
                  }`}
                >
                  {/* Top Bar with School Header */}
                  <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                        {schoolSettings?.schoolName?.charAt(0) || 'M'}
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-tight line-clamp-1">
                          {schoolSettings?.schoolName || 'BECE Candidate Examination Desk'}
                        </h4>
                        <p className="text-[9px] text-slate-500 font-bold uppercase">
                          BECE Mock Examination • {schoolSettings?.academicYear || '2025/2026'}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-900 text-white">
                      Desk #{st.indexNumber.slice(-3)}
                    </span>
                  </div>

                  {/* Candidate Body */}
                  <div className="flex items-center justify-between gap-3 my-2">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-black">Candidate Full Name</p>
                      <h3 className="text-sm font-black text-slate-950 uppercase leading-snug">
                        {st.fullName}
                      </h3>
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
                        <div>
                          <span className="text-slate-400 block font-bold">Index Number</span>
                          <span className="font-mono font-black text-xs text-blue-700">
                            {st.indexNumber}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold">Class / Group</span>
                          <span className="font-bold text-slate-800">
                            {st.classRoom?.name || st.class || 'Basic 9'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* QR Code Placeholder / Verification Block */}
                    <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-300 w-24 h-24 shrink-0 text-center">
                      <QrCode className="w-10 h-10 text-slate-800" />
                      <span className="text-[8px] font-mono font-bold mt-1 text-slate-600">
                        VERIFY
                      </span>
                      <span className="text-[7px] text-slate-400 font-mono">
                        {st.indexNumber}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Security Footer */}
                  <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between text-[9px] font-mono text-slate-500">
                    <span>ID: {st.studentId}</span>
                    <span className="font-bold text-slate-700">DO NOT DEFACE DESK SLIP</span>
                    <span>Sex: {st.gender?.charAt(0) || 'M'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
