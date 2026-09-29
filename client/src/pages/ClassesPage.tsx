import React, { useState, useEffect } from 'react';
import { School, Plus, Edit2, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const ClassesPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [name, setName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClasses();
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      const res = await api.getUsers();
      setTeachers((res || []).filter((u: any) => u.role === 'TEACHER'));
    } catch (err) {
      console.error('Failed to load teachers', err);
    }
  };

  const loadClasses = async () => {
    try {
      setLoading(true);
      const res = await api.getClassRooms();
      setClasses(Array.isArray(res) ? res : res.classes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingClass(null);
    setName('');
    setTeacherId('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cls: any) => {
    setEditingClass(cls);
    setName(cls.name);
    setTeacherId(cls.teacherId || '');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      name: name.trim(),
      teacherId: teacherId || null,
    };

    try {
      if (editingClass) {
        await api.updateClassRoom(editingClass.id, payload);
      } else {
        await api.createClassRoom(payload);
      }
      setIsModalOpen(false);
      loadClasses();
    } catch (err: any) {
      setError(err.message || 'Failed to save class.');
    }
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}"?`)) {
      return;
    }
    try {
      const res = await api.deleteClassRoom(id);
      alert(res.message || 'Class removed successfully');
      loadClasses();
    } catch (err: any) {
      alert(err.message || 'Failed to delete class.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Class Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure classes and cohorts in the system
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Class</span>
          </button>
        )}
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls) => (
          <div
            key={cls.id}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <School className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{cls.name}</h3>
              </div>
              {cls.teacher && (
                <p className="text-xs text-slate-500 font-medium ml-12">Teacher: {cls.teacher.name}</p>
              )}
            </div>

            {isAdmin && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(cls)}
                  className="px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteClass(cls.id, cls.name)}
                  className="px-2.5 py-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
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
                {editingClass ? 'Edit Class' : 'Add New Class'}
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

            <form onSubmit={handleSaveClass} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basic 9A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Teacher (Optional)</label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- No Teacher Assigned --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
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
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
