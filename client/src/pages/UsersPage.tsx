import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, X, Shield, Mail, User, BookOpen, Key } from 'lucide-react';
import { api } from '../services/api';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  // Form
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'TEACHER' | 'MANAGEMENT'>('TEACHER');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resUsers, resSubjects] = await Promise.all([
        api.getUsers(),
        api.getSubjects()
      ]);
      setUsers(resUsers.users || []);
      setSubjects(resSubjects.subjects || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSubjects = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setError(null);
    try {
      await api.updateUserSubjects(selectedUser.id, selectedSubjectIds);
      setIsSubjectModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to assign subjects.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setError(null);
    try {
      await api.resetUserPassword(selectedUser.id, resetPasswordVal);
      setIsResetModalOpen(false);
      setResetPasswordVal('');
      alert('Password reset successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.createUser({ name, username, email, password, role });
      setIsAddModalOpen(false);
      setName('');
      setUsername('');
      setEmail('');
      setPassword('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create user account.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            User Accounts & Roles
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-Based Access Control: Examination Officers, Teachers, and School Management
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>Add User Account</span>
        </button>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center">Assigned Role</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{u.username}</td>
                  <td className="py-3 px-4 text-slate-500">{u.email}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded font-extrabold text-[10px] uppercase tracking-wider ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : u.role === 'TEACHER'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setResetPasswordVal('');
                        setIsResetModalOpen(true);
                        setError(null);
                      }}
                      className="p-1.5 text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 hover:text-slate-700 transition-colors"
                      title="Reset Password"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    {u.role === 'TEACHER' && (
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setSelectedSubjectIds(u.subjects?.map((s: any) => s.subject.id) || []);
                          setIsSubjectModalOpen(true);
                          setError(null);
                        }}
                        className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors inline-block"
                        title="Assign Subjects"
                      >
                        <BookOpen className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create User Account</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mary Mensah"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. teacher.mary"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="TEACHER">TEACHER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="MANAGEMENT">MANAGEMENT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mary@achimota.edu.gh"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Assign Subjects Modal */}
      {isSubjectModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Assign Subjects</h3>
              <button onClick={() => setIsSubjectModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 mt-2 mb-4">
              Select the subjects that <strong>{selectedUser.name}</strong> is authorized to grade.
            </p>

            {error && (
              <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleAssignSubjects} className="space-y-4">
              <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                {subjects.map(sub => (
                  <label key={sub.id} className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300">
                    <input
                      type="checkbox"
                      checked={selectedSubjectIds.includes(sub.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSubjectIds([...selectedSubjectIds, sub.id]);
                        } else {
                          setSelectedSubjectIds(selectedSubjectIds.filter(id => id !== sub.id));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">{sub.name}</div>
                      <div className="text-[10px] text-slate-500">{sub.code}</div>
                    </div>
                  </label>
                ))}
                {subjects.length === 0 && (
                  <div className="text-xs text-slate-500 text-center py-4">No subjects found. Add subjects first.</div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30"
                >
                  Save Assignments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
              <button onClick={() => setIsResetModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 mt-2 mb-4">
              Enter a new password for <strong>{selectedUser.name}</strong>.
            </p>

            {error && (
              <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
