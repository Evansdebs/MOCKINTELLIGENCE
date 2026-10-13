const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '').replace(/\/api$/, '');
  }
  if (import.meta.env.PROD) {
    return 'https://mockintelligence.vercel.app';
  }
  return '/api';
};

const API_BASE = getApiBase();

// In-memory cache for fast UI clicks and deduplication
// In-flight request deduplication map to prevent multiple identical concurrent requests
const inFlightRequests = new Map<string, Promise<any>>();

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
// Data stays fresh for 90 seconds (0ms instant return)
const CACHE_FRESH_MS = 90 * 1000;
// Data can be served stale up to 5 minutes while revalidating in background
const CACHE_STALE_MS = 5 * 60 * 1000;

export function clearApiCache(endpointFilter?: string) {
  if (endpointFilter) {
    for (const key of memoryCache.keys()) {
      if (key.includes(endpointFilter)) {
        memoryCache.delete(key);
      }
    }
  } else {
    memoryCache.clear();
  }
  inFlightRequests.clear();
}

function triggerBackgroundRevalidation<T>(
  endpoint: string,
  options: RequestInit,
  cacheKey: string
) {
  if (inFlightRequests.has(cacheKey)) return;

  const promise = (async () => {
    try {
      const freshData = await performFetch<T>(endpoint, options, cacheKey);
      memoryCache.set(cacheKey, { data: freshData, timestamp: Date.now() });
    } catch (err) {
      // Background revalidation error silently handled
    }
  })();

  inFlightRequests.set(cacheKey, promise);
}

async function performFetch<T>(
  endpoint: string,
  options: RequestInit,
  requestKey: string
): Promise<T> {
  const token = localStorage.getItem('mock_intel_token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem('mock_intel_token');
      localStorage.removeItem('mock_intel_user');
      memoryCache.clear();
      inFlightRequests.clear();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      throw new Error('Oops!!! Check credentials, refresh and login again');
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || `Request failed with status ${response.status}`);
    }

    return data as T;
  } finally {
    inFlightRequests.delete(requestKey);
  }
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const token = localStorage.getItem('mock_intel_token');
  const requestKey = `${method}:${endpoint}:${token || ''}`;

  // If this is a mutation, clear caches so future GET requests receive fresh data
  if (method !== 'GET') {
    const result = await performFetch<T>(endpoint, options, requestKey);
    // Invalidate cached responses
    memoryCache.clear();
    return result;
  }

  // Check cache for GET requests
  const cached = memoryCache.get(requestKey);
  const now = Date.now();

  if (cached) {
    const age = now - cached.timestamp;
    // If completely fresh (under 90s), return immediately without touching network
    if (age < CACHE_FRESH_MS) {
      return cached.data as T;
    }
    // If stale but within window (under 5min), return cached immediately and revalidate in background
    if (age < CACHE_STALE_MS) {
      triggerBackgroundRevalidation<T>(endpoint, options, requestKey);
      return cached.data as T;
    }
  }

  // If a request for this exact endpoint is already in-flight, reuse it
  if (inFlightRequests.has(requestKey)) {
    return inFlightRequests.get(requestKey) as Promise<T>;
  }

  const fetchPromise = performFetch<T>(endpoint, options, requestKey).then((data) => {
    memoryCache.set(requestKey, { data, timestamp: Date.now() });
    return data;
  });

  inFlightRequests.set(requestKey, fetchPromise);
  return fetchPromise;
}

export const api = {
  // Auth
  login: (credentials: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  studentLogin: (credentials: any) => request<any>('/auth/student-login', { method: 'POST', body: JSON.stringify(credentials) }),
  me: () => request<any>('/auth/me'),

  // Settings
  getPublicSettings: () => request<any>('/settings/public'),
  getSettings: () => request<any>('/settings'),
  updateSettings: (data: any) => request<any>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  updateGradeScales: (scales: any[]) => request<any>('/settings/grades', { method: 'PUT', body: JSON.stringify({ scales }) }),

  // Students
  getStudents: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/students?${query}`);
  },
  getStudentById: (id: string) => request<any>(`/students/${id}`),
  createStudent: (data: any) => request<any>('/students', { method: 'POST', body: JSON.stringify(data) }),
  updateStudent: (id: string, data: any) => request<any>(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStudent: (id: string, force = false) => request<any>(`/students/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }),
  previewStudentImport: (formData: FormData) => request<any>('/students/import/preview', { method: 'POST', body: formData }),
  commitStudentImport: (students: any[]) => request<any>('/students/import/commit', { method: 'POST', body: JSON.stringify({ students }) }),

  // ClassRooms
  getClassRooms: () => request<any>('/classrooms'),
  createClassRoom: (data: any) => request<any>('/classrooms', { method: 'POST', body: JSON.stringify(data) }),
  updateClassRoom: (id: string, data: any) => request<any>(`/classrooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClassRoom: (id: string) => request<any>(`/classrooms/${id}`, { method: 'DELETE' }),

  // Subjects
  getSubjects: () => request<any>('/subjects'),
  createSubject: (data: any) => request<any>('/subjects', { method: 'POST', body: JSON.stringify(data) }),
  updateSubject: (id: string, data: any) => request<any>(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSubject: (id: string) => request<any>(`/subjects/${id}`, { method: 'DELETE' }),

  // Examinations
  getExaminations: (academicYear?: string) => {
    const query = academicYear ? `?academicYear=${academicYear}` : '';
    return request<any>(`/examinations${query}`);
  },
  getExaminationById: (id: string) => request<any>(`/examinations/${id}`),
  getExamSnapshot: (id: string) => request<any>(`/examinations/${id}/snapshot`),
  createExamination: (data: any) => request<any>('/examinations', { method: 'POST', body: JSON.stringify(data) }),
  updateExamination: (id: string, data: any) => request<any>(`/examinations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  completeExamination: (id: string) => request<any>(`/examinations/${id}/complete`, { method: 'POST' }),
  lockExamination: (id: string) => request<any>(`/examinations/${id}/lock`, { method: 'POST' }),
  unlockExamination: (id: string, reason?: string) => request<any>(`/examinations/${id}/unlock`, { method: 'POST', body: JSON.stringify({ reason }) }),
  deleteExamination: (id: string) => request<any>(`/examinations/${id}`, { method: 'DELETE' }),

  // Scores
  getScoreSheet: (params: { examinationId: string; subjectId?: string; classId?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any>(`/scores/sheet?${query}`);
  },
  batchSaveScores: (data: { examinationId: string; scores: any[] }) => request<any>('/scores/batch', { method: 'POST', body: JSON.stringify(data) }),
  previewScoreImport: (formData: FormData) => request<any>('/scores/import/preview', { method: 'POST', body: formData }),
  commitScoreImport: (data: { examinationId: string; subjectId: string; records: any[] }) => request<any>('/scores/import/commit', { method: 'POST', body: JSON.stringify(data) }),
  
  // OMR
  scanOmrSheet: (formData: FormData) => request<any>('/omr/scan', { method: 'POST', body: formData }),
  saveOmrScores: (data: { studentId: string; examinationId: string; subjectId: string; rawScore: number }) => request<any>('/omr/save', { method: 'POST', body: JSON.stringify(data) }),

  // Results
  getStudentResult: (studentId: string, examinationId: string) => request<any>(`/results/student/${studentId}/${examinationId}`),
  getClassResults: (examinationId: string, classFilter?: string) => {
    const query = classFilter ? `?classId=${classFilter}` : '';
    return request<any>(`/results/class/${examinationId}${query}`);
  },

  // Analytics
  getOverview: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/analytics/overview?${query}`);
  },
  getSubjectTrends: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/analytics/subject-trends?${query}`);
  },
  getMockComparison: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/analytics/mock-comparison?${query}`);
  },
  getGradeDistribution: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/analytics/grade-distribution?${query}`);
  },
  getHeatmap: (params: { examinationId: string; classId?: string }) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/analytics/heatmap?${query}`);
  },
  getStudentAnalytics: (studentId: string) => request<any>(`/analytics/student/${studentId}`),
  compareStudents: (studentIds: string[]) => request<any>('/analytics/compare-students', { method: 'POST', body: JSON.stringify({ studentIds }) }),
  getWeakAreasAndAlerts: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/analytics/weak-areas?${query}`);
  },
  getTeacherDashboard: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/analytics/teacher-dashboard?${query}`);
  },
  compareMultipleMocks: (examIds: string[], classFilter?: string) =>
    request<any>('/analytics/compare-mocks', {
      method: 'POST',
      body: JSON.stringify({ examIds, classId: classFilter }),
    }),

  // Audit Logs
  getAuditLogs: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/audit-logs?${query}`);
  },

  // Users
  getUsers: () => request<any>('/users'),
  createUser: (data: any) => request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => request<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => request<any>(`/users/${id}`, { method: 'DELETE' }),
  updateUserSubjects: (id: string, subjectIds: string[]) => request<any>(`/users/${id}/subjects`, { method: 'PUT', body: JSON.stringify({ subjectIds }) }),
  resetUserPassword: (id: string, newPassword: string) => request<any>(`/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ newPassword }) }),
  inviteStaffToAuth: (id: string) => request<any>(`/users/${id}/invite-auth`, { method: 'POST' }),

  // System Backup & Restore
  exportLocalBackup: () => request<any>('/backup/export'),
  createCloudBackup: (description?: string) => request<any>('/backup/cloud', { method: 'POST', body: JSON.stringify({ description }) }),
  listCloudBackups: () => request<any>('/backup/cloud/list'),
  downloadCloudBackup: (id: string) => request<any>(`/backup/cloud/${id}/download`),
  deleteCloudBackup: (id: string) => request<any>(`/backup/cloud/${id}`, { method: 'DELETE' }),
  restoreBackup: (snapshot: any) => request<any>('/backup/restore', { method: 'POST', body: JSON.stringify({ snapshot }) }),
  clearCache: clearApiCache,
  prefetch: (endpoint: string) => request<any>(endpoint),
};

