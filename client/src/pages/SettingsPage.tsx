import React, { useState, useEffect } from 'react';
import { Settings, Save, School, Award, Sliders, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { GradeScale } from '../types';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'school' | 'grading' | 'analytics'>('school');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // School Settings Form
  const [schoolName, setSchoolName] = useState('');
  const [address, setAddress] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [currentClass, setCurrentClass] = useState('Basic 9');
  const [motto, setMotto] = useState('');
  const [headteacherName, setHeadteacherName] = useState('');
  const [enableRanking, setEnableRanking] = useState(true);

  // Analytics Engine Thresholds
  const [passThreshold, setPassThreshold] = useState(50.0);
  const [stableThreshold, setStableThreshold] = useState(1.0);
  const [consecutiveDeclineAlertCount, setConsecutiveDeclineAlertCount] = useState(3);

  // Grade Scales
  const [gradeScales, setGradeScales] = useState<GradeScale[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.getSettings();
      if (res.settings) {
        const s = res.settings;
        setSchoolName(s.schoolName || '');
        setAddress(s.address || '');
        setTelephone(s.telephone || '');
        setEmail(s.email || '');
        setAcademicYear(s.academicYear || '2025/2026');
        setCurrentClass(s.currentClass || 'Basic 9');
        setMotto(s.motto || '');
        setHeadteacherName(s.headteacherName || '');
        setEnableRanking(s.enableRanking ?? true);
        setPassThreshold(s.passThreshold || 50.0);
        setStableThreshold(s.stableThreshold || 1.0);
        setConsecutiveDeclineAlertCount(s.consecutiveDeclineAlertCount || 3);
      }
      if (res.gradeScales) {
        setGradeScales(res.gradeScales);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchoolSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateSettings({
        schoolName,
        address,
        telephone,
        email,
        academicYear,
        currentClass,
        motto,
        headteacherName,
        enableRanking,
        passThreshold,
        stableThreshold,
        consecutiveDeclineAlertCount,
      });
      setSuccessMessage('School settings saved successfully.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGradeScales = async () => {
    try {
      setSaving(true);
      await api.updateGradeScales(gradeScales);
      setSuccessMessage('Grade boundary configurations saved successfully.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to save grade boundaries.');
    } finally {
      setSaving(false);
    }
  };

  const handleGradeScaleChange = (index: number, field: string, value: any) => {
    setGradeScales((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          System Configuration & Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure school metadata, grading scales, and predictive analytics thresholds
        </p>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl max-w-md text-xs font-bold">
        <button
          onClick={() => setActiveTab('school')}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            activeTab === 'school' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          School Information
        </button>
        <button
          onClick={() => setActiveTab('grading')}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            activeTab === 'grading' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          Grading Scale
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            activeTab === 'analytics' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          Analytics Engine
        </button>
      </div>

      {/* TAB 1: SCHOOL INFO (Section 7) */}
      {activeTab === 'school' && (
        <form onSubmit={handleSaveSchoolSettings} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            School Profile & Reports Header
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official School Name *
              </label>
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                School Motto
              </label>
              <input
                type="text"
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Principal / Headteacher Name
              </label>
              <input
                type="text"
                value={headteacherName}
                onChange={(e) => setHeadteacherName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Postal Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Telephone
              </label>
              <input
                type="text"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Academic Year
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target BECE Class
              </label>
              <input
                type="text"
                value={currentClass}
                onChange={(e) => setCurrentClass(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: GRADING SCALE CONFIGURATION (Section 15) */}
      {activeTab === 'grading' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Grading Engine Boundaries & Remarks (Section 15)
              </h3>
              <p className="text-xs text-slate-500">
                Customizable score percentage bands, letter grades, and automated remarks
              </p>
            </div>
            <button
              onClick={handleSaveGradeScales}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Boundaries</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Grade</th>
                  <th className="py-2.5 px-3">Min %</th>
                  <th className="py-2.5 px-3">Max %</th>
                  <th className="py-2.5 px-3">Grade Point</th>
                  <th className="py-2.5 px-3">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gradeScales.map((scale, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={scale.grade}
                        onChange={(e) => handleGradeScaleChange(idx, 'grade', e.target.value)}
                        className="w-16 px-2 py-1 border border-slate-200 rounded font-black text-center"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={scale.minScore}
                        onChange={(e) => handleGradeScaleChange(idx, 'minScore', Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-slate-200 rounded text-center"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={scale.maxScore}
                        onChange={(e) => handleGradeScaleChange(idx, 'maxScore', Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-slate-200 rounded text-center"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={scale.gradePoint || ''}
                        onChange={(e) => handleGradeScaleChange(idx, 'gradePoint', Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-slate-200 rounded text-center font-mono"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={scale.remark}
                        onChange={(e) => handleGradeScaleChange(idx, 'remark', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ANALYTICS THRESHOLDS (Section 24 & 36) */}
      {activeTab === 'analytics' && (
        <form onSubmit={handleSaveSchoolSettings} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Analytics Sensitivity & Alert Rules
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cohort Passing Target (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={passThreshold}
                onChange={(e) => setPassThreshold(Number(e.target.value))}
                className="w-48 px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Threshold for subjects requiring attention and pass rate calculation (Default: 50%)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stability Boundary (± points) (Section 24)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={stableThreshold}
                onChange={(e) => setStableThreshold(Number(e.target.value))}
                className="w-48 px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Points delta within which a learner's change between mocks is considered "Stable" (e.g. ±1.0)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Consecutive Decline Alert Count (mocks) (Section 36)
              </label>
              <input
                type="number"
                min="2"
                max="10"
                value={consecutiveDeclineAlertCount}
                onChange={(e) => setConsecutiveDeclineAlertCount(Number(e.target.value))}
                className="w-48 px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Triggers an academic alert when a learner records drops for this many consecutive mocks (Default: 3)
              </p>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableRanking}
                  onChange={(e) => setEnableRanking(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-800">
                  Enable Class Position Ranking on Result Slips (Section 17)
                </span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
