import React, { useState, useEffect } from 'react';
import {
  Cloud,
  HardDrive,
  Download,
  UploadCloud,
  RefreshCw,
  Trash2,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RotateCcw,
  Check,
} from 'lucide-react';
import { api } from '../services/api';

interface CloudBackupItem {
  id: string;
  filename: string;
  description?: string;
  sizeBytes: number;
  recordCounts: {
    students?: number;
    scores?: number;
    examinations?: number;
    users?: number;
    subjects?: number;
    classrooms?: number;
  };
  createdAt: string;
  createdBy: string;
}

export const BackupRestoreManager: React.FC = () => {
  const [cloudBackups, setCloudBackups] = useState<CloudBackupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [backingUpCloud, setBackingUpCloud] = useState(false);
  const [downloadingLocal, setDownloadingLocal] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [cloudDescription, setCloudDescription] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Restore Modal State
  const [restoreConfirmData, setRestoreConfirmData] = useState<{
    source: 'cloud' | 'local';
    title: string;
    snapshot: any;
  } | null>(null);

  useEffect(() => {
    fetchCloudBackups();
  }, []);

  const fetchCloudBackups = async () => {
    try {
      setLoading(true);
      const res = await api.listCloudBackups();
      setCloudBackups(res.backups || []);
    } catch (err: any) {
      console.error('Failed to load cloud backups:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 5000);
  };

  // Helper to trigger browser download of a JSON object
  const triggerBrowserDownload = (data: any, filename: string) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 1. Download Local Backup
  const handleDownloadLocal = async () => {
    try {
      setDownloadingLocal(true);
      const res = await api.exportLocalBackup();
      if (res.snapshot && res.filename) {
        triggerBrowserDownload(res.snapshot, res.filename);
        showNotification(
          'success',
          `Local backup downloaded: ${res.filename} (${res.snapshot.recordCounts?.students || 0} students, ${res.snapshot.recordCounts?.scores || 0} scores)`
        );
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to download local backup.');
    } finally {
      setDownloadingLocal(false);
    }
  };

  // 2. Backup to Cloud
  const handleBackupToCloud = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBackingUpCloud(true);
      const res = await api.createCloudBackup(cloudDescription.trim() || 'Manual Cloud Snapshot');
      if (res.success) {
        setCloudDescription('');
        showNotification('success', 'Backup successfully saved to Supabase cloud storage!');
        await fetchCloudBackups();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save cloud backup.');
    } finally {
      setBackingUpCloud(false);
    }
  };

  // 3. Download a specific cloud backup
  const handleDownloadCloudBackup = async (id: string, fallbackName: string) => {
    try {
      const res = await api.downloadCloudBackup(id);
      if (res.snapshot) {
        triggerBrowserDownload(res.snapshot, res.filename || fallbackName);
        showNotification('success', `Cloud backup ${fallbackName} downloaded successfully.`);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to retrieve cloud backup file.');
    }
  };

  // 4. Delete a cloud backup
  const handleDeleteCloudBackup = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete cloud backup "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      setDeletingId(id);
      await api.deleteCloudBackup(id);
      setCloudBackups((prev) => prev.filter((b) => b.id !== id));
      showNotification('success', 'Cloud backup deleted.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete backup.');
    } finally {
      setDeletingId(null);
    }
  };

  // 5. Select Local JSON file to restore
  const handleFileSelectForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.data || typeof parsed.data !== 'object') {
          showNotification('error', 'Selected file is not a valid Mock Intel backup snapshot.');
          return;
        }
        setRestoreConfirmData({
          source: 'local',
          title: file.name,
          snapshot: parsed,
        });
      } catch (err) {
        showNotification('error', 'Failed to read JSON backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 6. Select Cloud Backup to restore
  const handleCloudRestorePrompt = async (id: string, name: string) => {
    try {
      setLoading(true);
      const res = await api.downloadCloudBackup(id);
      if (res.snapshot) {
        setRestoreConfirmData({
          source: 'cloud',
          title: name,
          snapshot: res.snapshot,
        });
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to prepare cloud backup for restore.');
    } finally {
      setLoading(false);
    }
  };

  // 7. Execute Restore
  const executeRestore = async () => {
    if (!restoreConfirmData) return;
    try {
      setRestoring(true);
      const res = await api.restoreBackup(restoreConfirmData.snapshot);
      if (res.success) {
        setRestoreConfirmData(null);
        showNotification(
          'success',
          `System successfully restored! (${res.restoredCounts?.students || 0} students, ${res.restoredCounts?.scores || 0} scores updated)`
        );
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to execute system restore.');
    } finally {
      setRestoring(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Alert Notification */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs font-semibold animate-fadeIn border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Hero Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 p-5 rounded-2xl text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
              Cloud Storage
            </span>
            <Cloud className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-black">{cloudBackups.length}</div>
          <p className="text-xs text-blue-300 mt-1">
            Secure snapshots saved to Supabase Cloud
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Latest Snapshot
            </span>
            <Clock className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-sm font-bold text-slate-900 truncate">
            {cloudBackups.length > 0
              ? new Date(cloudBackups[0].createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'No backups yet'}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {cloudBackups.length > 0 ? `${formatBytes(cloudBackups[0].sizeBytes)}` : 'Create your first backup'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Data Protection
            </span>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-sm font-bold text-slate-900">Full System Scope</div>
          <p className="text-xs text-slate-500 mt-1">
            Students, Exams, Scores, Settings & Audit Logs
          </p>
        </div>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Action 1: Download Local Backup */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <HardDrive className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Download Local Backup File
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Generate and download a self-contained JSON backup file directly to your computer or flash drive.
              Includes all student profiles, exam records, mock scores, and system settings.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadLocal}
            disabled={downloadingLocal}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {downloadingLocal ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Exporting Snapshot...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Backup Locally (.json)</span>
              </>
            )}
          </button>
        </div>

        {/* Action 2: Backup to Cloud */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Cloud className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Backup to Supabase Cloud
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Create an encrypted cloud snapshot directly in Supabase. Provides instant recovery even if your local computer is lost or replaced.
            </p>
          </div>

          <form onSubmit={handleBackupToCloud} className="space-y-3">
            <input
              type="text"
              value={cloudDescription}
              onChange={(e) => setCloudDescription(e.target.value)}
              placeholder="Backup label (e.g. End of Mock 3 Term Backup)"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={backingUpCloud}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {backingUpCloud ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving to Cloud...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Backup to Cloud Now</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Cloud Backups History Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Cloud Backups Archive
            </h3>
            <p className="text-xs text-slate-400">
              Manage existing cloud snapshots stored in Supabase
            </p>
          </div>
          <button
            type="button"
            onClick={fetchCloudBackups}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {cloudBackups.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Cloud className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-medium">No cloud backups recorded yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click &quot;Backup to Cloud Now&quot; above to create your first cloud snapshot.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5 font-bold">Snapshot</th>
                  <th className="pb-2.5 font-bold">Contents</th>
                  <th className="pb-2.5 font-bold">Size</th>
                  <th className="pb-2.5 font-bold">Created At</th>
                  <th className="pb-2.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cloudBackups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <FileJson className="w-4 h-4 text-blue-500 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {b.description || b.filename}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {b.filename}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1 text-[11px]">
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">
                          {b.recordCounts?.students || 0} Students
                        </span>
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-medium">
                          {b.recordCounts?.scores || 0} Scores
                        </span>
                        <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded font-medium">
                          {b.recordCounts?.examinations || 0} Exams
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-500 font-mono text-[11px]">
                      {formatBytes(b.sizeBytes)}
                    </td>
                    <td className="py-3 text-slate-500">
                      <div>
                        {new Date(b.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(b.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        • by {b.createdBy}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDownloadCloudBackup(b.id, b.filename)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download local copy"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCloudRestorePrompt(b.id, b.description || b.filename)}
                          className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Restore from this backup"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCloudBackup(b.id, b.description || b.filename)}
                          disabled={deletingId === b.id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete cloud backup"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restore From Local File Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Restore from Backup File
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Upload an existing `.json` backup file from your device to restore system state.
        </p>
        <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors border border-slate-300">
          <UploadCloud className="w-4 h-4 text-slate-600" />
          <span>Select Backup JSON File</span>
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelectForRestore}
            className="hidden"
          />
        </label>
      </div>

      {/* Restore Confirmation Modal */}
      {restoreConfirmData && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleIn space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Confirm System Restore
                </h3>
                <p className="text-xs text-slate-500">
                  Source: {restoreConfirmData.title}
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-xl text-xs text-amber-900 leading-relaxed">
              <strong>Caution:</strong> Restoring this backup will update and sync records matching this snapshot.
              Existing records with identical IDs will be overwritten with the snapshot data.
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-slate-700">Snapshot Overview:</div>
              <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px]">
                <div>• Students: <span className="font-bold text-slate-900">{restoreConfirmData.snapshot.recordCounts?.students ?? restoreConfirmData.snapshot.data?.students?.length ?? 0}</span></div>
                <div>• Scores: <span className="font-bold text-slate-900">{restoreConfirmData.snapshot.recordCounts?.scores ?? restoreConfirmData.snapshot.data?.scores?.length ?? 0}</span></div>
                <div>• Examinations: <span className="font-bold text-slate-900">{restoreConfirmData.snapshot.recordCounts?.examinations ?? restoreConfirmData.snapshot.data?.examinations?.length ?? 0}</span></div>
                <div>• Subjects: <span className="font-bold text-slate-900">{restoreConfirmData.snapshot.recordCounts?.subjects ?? restoreConfirmData.snapshot.data?.subjects?.length ?? 0}</span></div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRestoreConfirmData(null)}
                disabled={restoring}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeRestore}
                disabled={restoring}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {restoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Restoring Database...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Restore Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
