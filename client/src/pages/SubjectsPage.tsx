import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit2, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Subject } from '../types';

export const SubjectsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [order, setOrder] = useState(0);
  const [status, setStatus] = useState('Active');
  const [classId, setClassId] = useState('');
  const [isCore, setIsCore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const [res, classesRes] = await Promise.all([
        api.getSubjects(),
        api.getClassRooms()
      ]);
      setSubjects(res.subjects || []);
      setClassesList(Array.isArray(classesRes) ? classesRes : classesRes.classes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingSubject(null);
    setName('');
    setCode('');
    setMaxScore(100);
    setOrder(subjects.length);
    setStatus('Active');
    setClassId('');
    setIsCore(false);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub: Subject) => {
    setEditingSubject(sub);
    setName(sub.name);
    setCode(sub.code);
    setMaxScore(sub.maxScore);
    setOrder(sub.order);
    setStatus(sub.status);
    setClassId((sub as any).classId || '');
    setIsCore((sub as any).isCore || false);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      maxScore: Number(maxScore) || 100,
      order: Number(order) || 0,
      status,
      classId: classId || null,
      isCore,
    };

    try {
      if (editingSubject) {
        await api.updateSubject(editingSubject.id, payload);
      } else {
        await api.createSubject(payload);
      }
      setIsModalOpen(false);
      loadSubjects();
    } catch (err: any) {
      setError(err.message || 'Failed to save subject.');
    }
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to deactivate or remove "${name}"? Historical examination records will remain intact.`)) {
      return;
    }
    try {
      const res = await api.deleteSubject(id);
      alert(res.message);
      loadSubjects();
    } catch (err: any) {
      alert(err.message || 'Failed to delete subject.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Curriculum Subjects
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure examination subjects, maximum obtainable scores, and curriculum codes
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
        )}
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((sub) => (
          <div
            key={sub.id}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-mono text-xs font-extrabold">
                  {sub.code}
                </span>
                <div className="flex gap-2">
                  {(sub as any).isCore && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                      Core
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      sub.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {sub.status}
                  </span>
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-900">{sub.name}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Max Obtainable Score: <span className="font-semibold text-slate-800">{sub.maxScore} marks</span>
              </p>
              {(sub as any).classRoom && (
                <p className="text-xs text-slate-500 mt-1">
                  Class: <span className="font-semibold text-slate-800">{(sub as any).classRoom.name}</span>
                </p>
              )}
            </div>

            {isAdmin && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(sub)}
                  className="px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteSubject(sub.id, sub.name)}
                  className="px-2.5 py-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Deactivate</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingSubject ? 'Edit Subject' : 'Add New Subject'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveSubject} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Integrated Science"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SCI"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Score *</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Class (Optional)</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- No Class (All) --</option>
                    {classesList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                
                <div className="flex items-center mt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCore}
                      onChange={(e) => setIsCore(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Core Subject</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
