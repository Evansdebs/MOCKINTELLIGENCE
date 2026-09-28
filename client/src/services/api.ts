const API_BASE = '/api';

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
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

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('mock_intel_token');
    localStorage.removeItem('mock_intel_user');
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  me: () => request<any>('/auth/me'),

  // Settings
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
  deleteStudent: (id: string) => request<any>(`/students/${id}`, { method: 'DELETE' }),
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

  // Scores
  getScoreSheet: (params: { examinationId: string; subjectId?: string; classId?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any>(`/scores/sheet?${query}`);
  },
  batchSaveScores: (data: { examinationId: string; scores: any[] }) => request<any>('/scores/batch', { method: 'POST', body: JSON.stringify(data) }),
  previewScoreImport: (formData: FormData) => request<any>('/scores/import/preview', { method: 'POST', body: formData }),
  commitScoreImport: (data: { examinationId: string; subjectId: string; records: any[] }) => request<any>('/scores/import/commit', { method: 'POST', body: JSON.stringify(data) }),

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
  updateUserSubjects: (id: string, subjectIds: string[]) => request<any>(`/users/${id}/subjects`, { method: 'PUT', body: JSON.stringify({ subjectIds }) }),
};
