import React, { useState, useEffect, useRef } from 'react';
import {
  Scan,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Search,
  Save,
  Check,
  X,
  Target,
  Printer
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Examination, Subject } from '../types';

export const OMRScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    try {
      const [examsRes, subsRes, studentsRes] = await Promise.all([
        api.getExaminations(),
        api.getSubjects(),
        api.getStudents()
      ]);
      
      const exams = examsRes.examinations || [];
      setExaminations(exams);
      if (exams.length > 0) setSelectedExamId(exams[exams.length - 1].id);
      
      const subs = subsRes.subjects || [];
      setSubjects(subs);
      if (subs.length > 0) setSelectedSubjectId(subs[0].id);

      if (studentsRes?.students) {
        setStudents(studentsRes.students);
      }
    } catch (err) {
      console.error('Failed to load OMR form data', err);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (JPG/PNG).');
      return;
    }
    setErrorMsg(null);
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setScanResult(null);
    setSaveSuccess(false);
  };

  const processOmrSheet = async () => {
    if (!file) return;
    try {
      setIsScanning(true);
      setErrorMsg(null);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await api.scanOmrSheet(formData);
      setScanResult(res.data);
      
      // Auto-match student by index number
      if (res.data.extractedIndexNumber) {
        const match = students.find(s => s.indexNumber === res.data.extractedIndexNumber);
        if (match) {
          setSelectedStudentId(match.id);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to scan OMR sheet');
    } finally {
      setIsScanning(false);
    }
  };

  const saveScores = async () => {
    if (!scanResult || !selectedStudentId || !selectedExamId || !selectedSubjectId) return;
    
    try {
      setIsSaving(true);
      setErrorMsg(null);
      
      await api.saveOmrScores({
        studentId: selectedStudentId,
        examinationId: selectedExamId,
        subjectId: selectedSubjectId,
        rawScore: scanResult.rawScore
      });
      
      setSaveSuccess(true);
      
      // Reset for next sheet after 2 seconds
      setTimeout(() => {
        setFile(null);
        setPreviewUrl(null);
        setScanResult(null);
        setSaveSuccess(false);
        setSelectedStudentId('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 2000);
      
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save OMR scores');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Scan className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-xs uppercase tracking-wider mb-1.5 border border-amber-200">
                <Target className="w-3.5 h-3.5" />
                Beta Feature
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">OMR Sheet Scanner</h1>
              <p className="text-xs text-slate-500 font-medium">
                Upload and auto-grade multiple choice examination sheets
              </p>
            </div>
          </div>
          <div>
            <button
              onClick={() => navigate('/scores/omr/templates')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print Templates
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Context & Upload */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <h2 className="text-sm font-extrabold text-slate-900 mb-4 uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-600" />
              1. Assessment Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Examination</label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Select Examination</option>
                  {examinations.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <h2 className="text-sm font-extrabold text-slate-900 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Scan className="w-4 h-4 text-blue-600" />
              2. Upload OMR Sheet
            </h2>
            
            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="w-4 h-4" />
                {errorMsg}
              </div>
            )}

            {!previewUrl ? (
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="w-12 h-12 text-blue-500 mb-4" />
                <h3 className="text-base font-bold text-slate-900 mb-1">Click or drag image to upload</h3>
                <p className="text-xs text-slate-500 font-medium">Supports JPG, PNG (High resolution recommended)</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} 
                  accept="image/png, image/jpeg"
                  capture="environment" 
                  className="hidden" 
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-96 flex items-center justify-center">
                  <img src={previewUrl} alt="OMR Preview" className="max-h-full object-contain" />
                  
                  {isScanning && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                      <RefreshCw className="w-10 h-10 animate-spin text-blue-400 mb-4" />
                      <h3 className="font-bold text-lg">Scanning OMR Marks...</h3>
                      <p className="text-xs text-slate-300">Processing optical targets</p>
                    </div>
                  )}

                  {saveSuccess && (
                    <div className="absolute inset-0 bg-emerald-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                      <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mb-4">
                        <Check className="w-8 h-8" />
                      </div>
                      <h3 className="font-bold text-xl">Score Saved!</h3>
                      <p className="text-sm text-emerald-100">Ready for next sheet.</p>
                    </div>
                  )}
                </div>

                {!scanResult && !isScanning && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={processOmrSheet}
                      className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Scan className="w-5 h-5" />
                      Run Optical Scan
                    </button>
                    <button
                      onClick={() => { setFile(null); setPreviewUrl(null); }}
                      className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Results & Verification */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm h-full">
            <h2 className="text-sm font-extrabold text-slate-900 mb-4 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              3. Verify & Save
            </h2>

            {!scanResult ? (
              <div className="h-64 flex flex-col items-center justify-center text-center px-4">
                <Target className="w-12 h-12 text-slate-200 mb-3" />
                <p className="text-sm font-bold text-slate-400">Scan an OMR sheet to see extracted results here.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Score Summary */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Raw Score</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-emerald-900">{scanResult.rawScore}</span>
                      <span className="text-sm font-bold text-emerald-600">/ {scanResult.maxScore}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Confidence</p>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-emerald-100 text-xs font-bold text-emerald-700">
                      {scanResult.confidence}%
                    </span>
                  </div>
                </div>

                {/* Student Assignment */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assign to Student</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      selectedStudentId ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <option value="" disabled>-- Select Verified Student --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.indexNumber} - {s.fullName}
                      </option>
                    ))}
                  </select>
                  {!selectedStudentId && (
                    <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Must verify student identity to save
                    </p>
                  )}
                  {selectedStudentId && (
                    <p className="text-xs text-slate-500 mt-1.5">
                      Extracted Index: <span className="font-mono font-bold text-slate-700">{scanResult.extractedIndexNumber}</span>
                    </p>
                  )}
                </div>

                <button
                  onClick={saveScores}
                  disabled={!selectedStudentId || isSaving || saveSuccess}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all"
                >
                  {isSaving ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : saveSuccess ? (
                    <><Check className="w-4 h-4" /> Saved Successfully</>
                  ) : (
                    <><Save className="w-4 h-4" /> Save Score to Database</>
                  )}
                </button>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-900 mb-3 flex items-center justify-between">
                    <span>Question Breakdown</span>
                    <span className="text-[10px] text-slate-500 uppercase">First 10</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {scanResult.answers.slice(0, 10).map((ans: any) => (
                      <div key={ans.question} className={`px-2 py-1.5 rounded-lg border flex items-center justify-between text-xs font-mono font-bold ${ans.isCorrect ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                        <span>Q{ans.question}</span>
                        <span>{ans.marked}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
