import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Upload,
  Download,
  Filter,
  Eye,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Student } from '../types';

export const StudentsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [students, setStudents] = useState<Student[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [classFilter, setClassFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Add/Edit Form
  const [formStudentId, setFormStudentId] = useState('');
  const [formIndexNumber, setFormIndexNumber] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formMiddleName, setFormMiddleName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formGender, setFormGender] = useState('Male');
  const [formClassId, setFormClassId] = useState('');
  const [formHouse, setFormHouse] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [classFilter, genderFilter, statusFilter]);

  const loadStudents = async (query = searchQuery) => {
    try {
      setLoading(true);
      const res = await api.getStudents({
        search: query,
        class: classFilter,
        gender: genderFilter,
        status: statusFilter,
      });
      setStudents(res.students || []);
      if (res.classes) {
        setClassesList(res.classes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadStudents(searchQuery);
  };

  const handleOpenAdd = () => {
    setFormStudentId(`ACH/B9/0${students.length + 1}`);
    setFormIndexNumber(`0102030${students.length + 1}`);
    setFormFirstName('');
    setFormMiddleName('');
    setFormLastName('');
    setFormGender('Male');
    setFormClassId(classesList.length > 0 ? classesList[0].id : '');
    setFormHouse('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (st: Student) => {
    setSelectedStudent(st);
    setFormStudentId(st.studentId);
    setFormIndexNumber(st.indexNumber);
    setFormFirstName(st.firstName);
    setFormMiddleName(st.middleName || '');
    setFormLastName(st.lastName);
    setFormGender(st.gender);
    setFormClassId(st.classId || '');
    setFormHouse(st.house || '');
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      studentId: formStudentId.trim(),
      indexNumber: formIndexNumber.trim(),
      firstName: formFirstName.trim(),
      middleName: formMiddleName.trim() || undefined,
      lastName: formLastName.trim(),
      gender: formGender,
      classId: formClassId,
      house: formHouse.trim() || undefined,
    };

    try {
      if (isEditModalOpen && selectedStudent) {
        await api.updateStudent(selectedStudent.id, payload);
        setIsEditModalOpen(false);
      } else {
        await api.createStudent(payload);
        setIsAddModalOpen(false);
      }
      loadStudents();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save student.');
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to deactivate or remove ${name}? Historical examination records will remain intact.`)) {
      return;
    }
    try {
      const res = await api.deleteStudent(id);
      alert(res.message);
      loadStudents();
    } catch (err: any) {
      alert(err.message || 'Failed to delete student.');
    }
  };

  // Excel Import handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
      setImportPreview(null);
    }
  };

  const handlePreviewImport = async () => {
    if (!importFile) return;
    try {
      setImportLoading(true);
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await api.previewStudentImport(fd);
      setImportPreview(res);
    } catch (err: any) {
      alert(err.message || 'Failed to parse Excel file.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importPreview?.validRecords?.length) return;
    try {
      setImportLoading(true);
      const res = await api.commitStudentImport(importPreview.validRecords);
      alert(res.message);
      setIsImportModalOpen(false);
      setImportFile(null);
      setImportPreview(null);
      loadStudents();
    } catch (err: any) {
      alert(err.message || 'Import failed.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleExportExcel = () => {
    window.open('/api/students/export/excel', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Basic 9 Learners
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registered candidates preparing for Basic Education Certificate Examination (BECE)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => {
                  setImportFile(null);
                  setImportPreview(null);
                  setIsImportModalOpen(true);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Import Excel</span>
              </button>

              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Student</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, or index..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">All Classes</option>
            {classesList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="all">All Status</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Index No</th>
                <th className="py-3.5 px-4">Student ID</th>
                <th className="py-3.5 px-4">Candidate Full Name</th>
                <th className="py-3.5 px-4">Gender</th>
                <th className="py-3.5 px-4">Class</th>
                <th className="py-3.5 px-4">House</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length > 0 ? (
                students.map((st) => (
                  <tr
                    key={st.id}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/students/${st.id}`)}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {st.indexNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{st.studentId}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {st.fullName}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          st.gender === 'Female'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                            : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                        }`}
                      >
                        {st.gender}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{st.classRoom?.name || st.class || '—'}</td>
                    <td className="py-3.5 px-4 text-slate-500">{st.house || '—'}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          st.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {st.status}
                      </span>
                    </td>
                    <td
                      className="py-3.5 px-4 text-right space-x-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => navigate(`/students/${st.id}`)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Detailed Profile & Mocks"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(st)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Learner Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(st.id, st.fullName)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Deactivate / Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No learners match the current filter or search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {isEditModalOpen ? 'Edit Learner Record' : 'Register Basic 9 Learner'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formStudentId}
                    onChange={(e) => setFormStudentId(e.target.value)}
                    placeholder="e.g. ACH/B9/020"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    BECE Index Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formIndexNumber}
                    onChange={(e) => setFormIndexNumber(e.target.value)}
                    placeholder="e.g. 010203020"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={formMiddleName}
                    onChange={(e) => setFormMiddleName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Class *</label>
                  <select
                    value={formClassId}
                    onChange={(e) => setFormClassId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Select a class...</option>
                    {classesList.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">House</label>
                  <input
                    type="text"
                    value={formHouse}
                    onChange={(e) => setFormHouse(e.target.value)}
                    placeholder="e.g. Guggisberg"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30"
                >
                  {isEditModalOpen ? 'Save Changes' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Student Import Modal (Section 9) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Import Students from Excel</h3>
                  <p className="text-[11px] text-slate-500">
                    Expected columns: Student ID, Index Number, First Name, Middle Name, Last Name, Gender, Class, House
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* File Upload Area */}
            <div className="mt-4 p-4 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
              />
              {importFile && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    onClick={handlePreviewImport}
                    disabled={importLoading}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500 disabled:opacity-50"
                  >
                    {importLoading ? 'Validating...' : 'Validate & Preview Sheet'}
                  </button>
                </div>
              )}
            </div>

            {/* Preview Results (Validation summary, valid records, invalid records) */}
            {importPreview && (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-100 text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Total Found</p>
                    <p className="text-lg font-extrabold text-slate-900">{importPreview.totalFound}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 text-center border border-emerald-200">
                    <p className="text-[10px] uppercase font-bold text-emerald-700">Valid Records</p>
                    <p className="text-lg font-extrabold text-emerald-800">{importPreview.validCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50 text-center border border-rose-200">
                    <p className="text-[10px] uppercase font-bold text-rose-700">Invalid Records</p>
                    <p className="text-lg font-extrabold text-rose-800">{importPreview.invalidCount}</p>
                  </div>
                </div>

                {/* Errors Breakdown */}
                {importPreview.invalidRecords?.length > 0 && (
                  <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs">
                    <p className="font-bold text-rose-900 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Detected Errors in Sheet (These rows will be skipped):
                    </p>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {importPreview.invalidRecords.map((inv: any, idx: number) => (
                        <div key={idx} className="text-[11px] text-rose-800 bg-white/80 p-2 rounded border border-rose-200">
                          <span className="font-bold">Row {inv.rowNum}:</span> {inv.fullName || 'Nameless'} ({inv.indexNumber || 'No Index'}) — {inv.errors.join(', ')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Valid Records Preview List */}
                {importPreview.validRecords?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-800 mb-1.5">
                      Ready to import {importPreview.validCount} valid learners:
                    </p>
                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                          <tr>
                            <th className="p-2">Index</th>
                            <th className="p-2">Name</th>
                            <th className="p-2">Gender</th>
                            <th className="p-2">Class</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importPreview.validRecords.map((v: any, idx: number) => (
                            <tr key={idx}>
                              <td className="p-2 font-mono font-bold">{v.indexNumber}</td>
                              <td className="p-2 font-semibold text-slate-800">{v.fullName}</td>
                              <td className="p-2">{v.gender}</td>
                              <td className="p-2">{v.class}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={importLoading || importPreview.validCount === 0}
                    onClick={handleCommitImport}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/30 disabled:opacity-50"
                  >
                    Confirm & Import {importPreview.validCount} Students
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
