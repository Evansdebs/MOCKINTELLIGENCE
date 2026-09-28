import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, Clock, User } from 'lucide-react';
import { api } from '../services/api';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs({ action: actionFilter });
      setLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Security & Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of score changes, examination locking, and administrative system actions
          </p>
        </div>

        {/* Filter */}
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm focus:outline-none"
        >
          <option value="">All Audit Actions</option>
          <option value="USER_LOGIN">User Logins</option>
          <option value="BATCH_SCORE_UPDATE">Score Updates</option>
          <option value="LOCK_EXAMINATION">Exam Locks</option>
          <option value="UNLOCK_EXAMINATION">Exam Unlocks</option>
          <option value="CREATE_STUDENT">Student Creations</option>
          <option value="BULK_IMPORT_STUDENTS">Bulk Student Imports</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Change Details / New Value</th>
                <th className="py-3 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-sans font-bold text-slate-800">
                      {log.userName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-blue-50 text-blue-700 border border-blue-200/60">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{log.recordType}</td>
                    <td className="py-3 px-4 font-sans text-slate-700 max-w-xs truncate" title={log.newValue}>
                      {log.newValue || log.oldValue || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{log.ipAddress || '127.0.0.1'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No audit records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
