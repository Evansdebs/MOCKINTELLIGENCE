import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Save,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Search,
  RefreshCw,
  X,
  FileCheck,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Examination, Subject } from '../types';

export const ScoreEntryPage: React.FC = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Active view tab: 'grid' or 'import'
  const [activeTab, setActiveTab] = useState<'grid' | 'import'>('grid');

  // Filters
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sheet Data
  const [sheetData, setSheetData] = useState<any>(null);
  const [scoresDraft, setScoresDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | 'error'>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSubjectId, setImportSubjectId] = useState<string>('');
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    initPage();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      loadScoreSheet();
    }
  }, [selectedExamId, selectedSubjectId, selectedClass]);

  const initPage = async () => {
    try {
      const [examsRes, subsRes, studentsRes] = await Promise.all([
        api.getExaminations(),
        api.getSubjects(),
        api.getStudents(),
      ]);

      const exams = examsRes.examinations || [];
      setExaminations(exams);
      
      let fetchedSubjects = subsRes.subjects || [];
      if (user?.role === 'TEACHER' && (user as any).subjects) {
        const assignedIds = (user as any).subjects.map((s: any) => s.subjectId);
        fetchedSubjects = fetchedSubjects.filter((s: any) => assignedIds.includes(s.id));
      }
      setSubjects(fetchedSubjects);
      
      if (fetchedSubjects.length > 0) {
        setImportSubjectId(fetchedSubjects[0].id);
      }
      if (studentsRes?.classes) {
        setClassesList(studentsRes.classes);
      }

      // Default to query param or latest examination
      const queryExam = searchParams.get('examId');
      if (queryExam && exams.some((e: any) => e.id === queryExam)) {
        setSelectedExamId(queryExam);
      } else if (exams.length > 0) {
        setSelectedExamId(exams[exams.length - 1].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadScoreSheet = async () => {
    if (!selectedExamId) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.getScoreSheet({
        examinationId: selectedExamId,
        subjectId: selectedSubjectId !== 'all' ? selectedSubjectId : undefined,
        class: selectedClass !== 'all' ? selectedClass : undefined,
      });

      setSheetData(res);

      // Populate draft scores dictionary: key = `${studentId}_${subjectId}`
      const initialDraft: Record<string, string> = {};
      res.rows.forEach((row: any) => {
        Object.keys(row.scores).forEach((subId) => {
          const sc = row.scores[subId];
          initialDraft[`${row.student.id}_${subId}`] =
            sc && sc.rawScore !== null && sc.rawScore !== undefined ? String(sc.rawScore) : '';
        });
      });

      setScoresDraft(initialDraft);
      setSaveStatus('saved');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load score sheet.');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (studentId: string, subjectId: string, val: string) => {
    setScoresDraft((prev) => ({
      ...prev,
      [`${studentId}_${subjectId}`]: val,
    }));
    setSaveStatus('dirty');
  };

  const handleSaveAllScores = async () => {
    if (!selectedExamId || sheetData?.examination?.isLocked) return;
    try {
      setSaveStatus('saving');
      setErrorMessage(null);

      const payloadScores: any[] = [];
      Object.entries(scoresDraft).forEach(([key, rawVal]) => {
        const [studentId, subjectId] = key.split('_');
        payloadScores.push({
          studentId,
          subjectId,
          rawScore: rawVal.trim() === '' ? null : rawVal.trim(),
        });
      });

      const res = await api.batchSaveScores({
        examinationId: selectedExamId,
        scores: payloadScores,
      });

      if (res.errors && res.errors.length > 0) {
        setErrorMessage(res.errors.join(' | '));
      }

      setSaveStatus('saved');
      loadScoreSheet();
    } catch (err: any) {
      setSaveStatus('error');
      setErrorMessage(err.message || 'Failed to save scores.');
    }
  };

  // Import handlers
  const handleDownloadTemplate = () => {
    window.open(`/api/scores/template?class=${selectedClass}`, '_blank');
  };

  const handlePreviewScoreImport = async () => {
    if (!importFile || !selectedExamId || !importSubjectId) return;
    try {
      setImportLoading(true);
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('examinationId', selectedExamId);
      fd.append('subjectId', importSubjectId);

      const res = await api.previewScoreImport(fd);
      setImportPreview(res);
    } catch (err: any) {
      alert(err.message || 'Failed to preview score file.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCommitScoreImport = async () => {
    if (!importPreview?.validRecords?.length) return;
    try {
      setImportLoading(true);
      const res = await api.commitScoreImport({
        examinationId: selectedExamId,
        subjectId: importSubjectId,
        records: importPreview.validRecords,
      });
      alert(res.message);
      setImportFile(null);
      setImportPreview(null);
      setActiveTab('grid');
      loadScoreSheet();
    } catch (err: any) {
      alert(err.message || 'Score import failed.');
    } finally {
      setImportLoading(false);
    }
  };

  const filteredRows =
    sheetData?.rows?.filter((r: any) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.student.fullName.toLowerCase().includes(q) ||
        r.student.indexNumber.toLowerCase().includes(q)
      );
    }) || [];

  const isLocked = sheetData?.examination?.isLocked;

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Score Entry & Ingestion
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Spreadsheet-style marks recorder and Excel bulk score importer
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl">
          <button
            onClick={() => setActiveTab('grid')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'grid'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Spreadsheet Grid
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'import'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Excel Bulk Import
          </button>
        </div>
      </div>

      {/* Examination & Class Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Exam Selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Examination
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              {examinations.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} {ex.status === 'Locked' ? '🔒 (Locked)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter (in grid view) */}
          {activeTab === 'grid' && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Subject
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Subjects Matrix</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Class Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Classes</option>
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Save Status & Action button */}
        {activeTab === 'grid' && (
          <div className="flex items-center gap-3">
            {isLocked ? (
              <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Examination is Locked (Read Only)</span>
              </div>
            ) : (
              <>
                <div className="text-xs flex items-center gap-1.5">
                  {saveStatus === 'saved' && (
                    <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> All saved
                    </span>
                  )}
                  {saveStatus === 'saving' && (
                    <span className="text-blue-600 flex items-center gap-1 font-semibold animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </span>
                  )}
                  {saveStatus === 'dirty' && (
                    <span className="text-amber-600 font-semibold">Unsaved edits</span>
                  )}
                </div>

                <button
                  onClick={handleSaveAllScores}
                  disabled={saveStatus === 'saving'}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 disabled:opacity-50 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Scores</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TAB 1: SPREADSHEET GRID */}
      {activeTab === 'grid' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Search inside sheet */}
          <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter table by candidate..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="text-[11px] text-slate-400">
              Showing <span className="font-bold text-slate-700">{filteredRows.length}</span> students
            </div>
          </div>

          <div className="overflow-x-auto max-h-[650px] relative">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider sticky top-0 z-20 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center sticky left-0 bg-slate-100 z-30">#</th>
                  <th className="py-3 px-3 w-28 sticky left-10 bg-slate-100 z-30">Index No</th>
                  <th className="py-3 px-4 min-w-[180px] sticky left-36 bg-slate-100 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                    Candidate Name
                  </th>
                  {sheetData?.subjects?.map((sub: any) => (
                    <th key={sub.id} className="py-3 px-3 text-center min-w-[100px]">
                      <div>{sub.name}</div>
                      <span className="text-[9px] font-normal text-slate-400">Max: {sub.maxScore}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length > 0 ? (
                  filteredRows.map((row: any, idx: number) => (
                    <tr key={row.student.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-2 px-3 text-center text-slate-400 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800 sticky left-10 bg-white z-10">
                        {row.student.indexNumber}
                      </td>
                      <td className="py-2 px-4 font-semibold text-slate-900 sticky left-36 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] truncate">
                        {row.student.fullName}
                      </td>

                      {/* Subject input cells */}
                      {sheetData?.subjects?.map((sub: any) => {
                        const cellKey = `${row.student.id}_${sub.id}`;
                        const currentVal = scoresDraft[cellKey] ?? '';
                        const numeric = Number(currentVal);
                        const isInvalid = currentVal !== '' && (isNaN(numeric) || numeric < 0 || numeric > sub.maxScore);

                        return (
                          <td key={sub.id} className="py-1 px-2 text-center">
                            <input
                              type="number"
                              disabled={isLocked}
                              min="0"
                              max={sub.maxScore}
                              value={currentVal}
                              onChange={(e) => handleScoreChange(row.student.id, sub.id, e.target.value)}
                              placeholder="—"
                              className={`w-16 py-1 px-1.5 text-center font-bold text-xs rounded-lg border focus:outline-none transition-all ${
                                isLocked
                                  ? 'bg-slate-50 text-slate-600 border-transparent'
                                  : isInvalid
                                  ? 'bg-rose-50 border-rose-400 text-rose-700 ring-2 ring-rose-200'
                                  : currentVal !== ''
                                  ? 'bg-white border-blue-200 text-blue-900 focus:ring-2 focus:ring-blue-500'
                                  : 'bg-slate-50 border-slate-200 text-slate-400 focus:bg-white focus:border-blue-500'
                              }`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={(sheetData?.subjects?.length || 0) + 3}
                      className="py-12 text-center text-slate-400"
                    >
                      {loading ? 'Loading score matrix...' : 'No candidate rows found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: EXCEL BULK SCORE IMPORT (Section 14) */}
      {activeTab === 'import' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm max-w-3xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Import Examination Scores from Excel
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload verified subject score sheets (.xlsx or .xls) with automatic error diagnostics
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Blank Template</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Subject *
              </label>
              <select
                value={importSubjectId}
                onChange={(e) => {
                  setImportSubjectId(e.target.value);
                  setImportPreview(null);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} (Max: {sub.maxScore} marks)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Excel File *
              </label>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setImportFile(e.target.files[0]);
                    setImportPreview(null);
                  }
                }}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {importFile && !importPreview && (
            <div className="pt-2">
              <button
                onClick={handlePreviewScoreImport}
                disabled={importLoading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30 disabled:opacity-50"
              >
                {importLoading ? 'Validating Marks...' : 'Upload & Validate File'}
              </button>
            </div>
          )}

          {/* Validation Diagnostics Output */}
          {importPreview && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Total Entries</p>
                  <p className="text-xl font-extrabold text-slate-900">{importPreview.totalFound}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-center border border-emerald-200">
                  <p className="text-[10px] font-bold uppercase text-emerald-700">Valid Records</p>
                  <p className="text-xl font-extrabold text-emerald-800">{importPreview.validCount}</p>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl text-center border border-rose-200">
                  <p className="text-[10px] font-bold uppercase text-rose-700">Invalid Records</p>
                  <p className="text-xl font-extrabold text-rose-800">{importPreview.invalidCount}</p>
                </div>
              </div>

              {/* Show errors list if any */}
              {importPreview.invalidRecords?.length > 0 && (
                <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-xs">
                  <p className="font-bold text-rose-900 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Validation Errors (These marks will be rejected):
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {importPreview.invalidRecords.map((inv: any, idx: number) => (
                      <div key={idx} className="p-2 rounded bg-white text-rose-800 text-[11px] border border-rose-100">
                        <span className="font-bold">Row {inv.rowNum}:</span> Index {inv.indexNumber || 'Missing'} ({inv.studentName}) — {inv.errors.join(', ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirm Import */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportFile(null);
                    setImportPreview(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importLoading || importPreview.validCount === 0}
                  onClick={handleCommitScoreImport}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/30 disabled:opacity-50"
                >
                  Confirm & Commit {importPreview.validCount} Scores
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
