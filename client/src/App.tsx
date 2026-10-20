import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './layouts/AppLayout';

// Lazy-loaded page components for maximum initial load performance
const LoginPage = React.lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ExaminationsPage = React.lazy(() => import('./pages/ExaminationsPage').then((m) => ({ default: m.ExaminationsPage })));
const StudentsPage = React.lazy(() => import('./pages/StudentsPage').then((m) => ({ default: m.StudentsPage })));
const StudentDetailPage = React.lazy(() => import('./pages/StudentDetailPage').then((m) => ({ default: m.StudentDetailPage })));
const SubjectsPage = React.lazy(() => import('./pages/SubjectsPage').then((m) => ({ default: m.SubjectsPage })));
const ClassesPage = React.lazy(() => import('./pages/ClassesPage').then((m) => ({ default: m.ClassesPage })));
const ScoreEntryPage = React.lazy(() => import('./pages/ScoreEntryPage').then((m) => ({ default: m.ScoreEntryPage })));
const OMRScannerPage = React.lazy(() => import('./pages/OMRScannerPage').then((m) => ({ default: m.OMRScannerPage })));
const OMRTemplatePage = React.lazy(() => import('./pages/OMRTemplatePage').then((m) => ({ default: m.OMRTemplatePage })));
const ResultsPage = React.lazy(() => import('./pages/ResultsPage').then((m) => ({ default: m.ResultsPage })));
const MockIntelligencePage = React.lazy(() => import('./pages/MockIntelligencePage').then((m) => ({ default: m.MockIntelligencePage })));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const UsersPage = React.lazy(() => import('./pages/UsersPage').then((m) => ({ default: m.UsersPage })));
const AuditLogsPage = React.lazy(() => import('./pages/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const StudentPortalPage = React.lazy(() => import('./pages/StudentPortalPage').then((m) => ({ default: m.StudentPortalPage })));

// Quick preloader function to prefetch bundles on hover or touch
export const preloadRoute = (path: string) => {
  switch (path) {
    case '/dashboard':
      import('./pages/DashboardPage');
      break;
    case '/examinations':
      import('./pages/ExaminationsPage');
      break;
    case '/students':
      import('./pages/StudentsPage');
      break;
    case '/subjects':
      import('./pages/SubjectsPage');
      break;
    case '/classes':
      import('./pages/ClassesPage');
      break;
    case '/scores':
      import('./pages/ScoreEntryPage');
      break;
    case '/scores/omr':
      import('./pages/OMRScannerPage');
      break;
    case '/results':
      import('./pages/ResultsPage');
      break;
    case '/analytics':
      import('./pages/MockIntelligencePage');
      break;
    case '/reports':
      import('./pages/ReportsPage');
      break;
    case '/users':
      import('./pages/UsersPage');
      break;
    case '/audit-logs':
      import('./pages/AuditLogsPage');
      break;
    case '/settings':
      import('./pages/SettingsPage');
      break;
    case '/portal':
      import('./pages/StudentPortalPage');
      break;
  }
};

export const RouteFallback: React.FC = () => (
  <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full animate-fadeIn">
    {/* Dynamic Top Bar Progress */}
    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full bg-blue-600 rounded-full animate-progress origin-left" />
    </div>

    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-32 bg-slate-200 rounded-full" />
        <div className="h-7 w-64 bg-slate-200 rounded-xl" />
      </div>
      <div className="h-10 w-32 bg-slate-200 rounded-xl" />
    </div>

    {/* Metric Cards Skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      <div className="h-28 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="h-3 w-20 bg-slate-200 rounded" />
        <div className="h-8 w-24 bg-slate-200 rounded-lg" />
      </div>
      <div className="h-28 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="h-3 w-20 bg-slate-200 rounded" />
        <div className="h-8 w-24 bg-slate-200 rounded-lg" />
      </div>
      <div className="h-28 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="h-3 w-20 bg-slate-200 rounded" />
        <div className="h-8 w-24 bg-slate-200 rounded-lg" />
      </div>
      <div className="h-28 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="h-3 w-20 bg-slate-200 rounded" />
        <div className="h-8 w-24 bg-slate-200 rounded-lg" />
      </div>
    </div>

    {/* Large Section Skeleton */}
    <div className="h-80 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-4 w-44 bg-slate-200 rounded-full" />
        <div className="h-8 w-20 bg-slate-100 rounded-lg" />
      </div>
      <div className="h-48 w-full bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-400">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading module resources...</span>
        </div>
      </div>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { user, isLoading, isAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3 text-white text-xs font-mono">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="tracking-widest opacity-80">INITIALIZING ONEREAL MOCKINTEL...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (user.role === 'STUDENT' && !location.pathname.startsWith('/portal')) {
    return <Navigate to="/portal" replace />;
  }
  
  if (user.role !== 'STUDENT' && location.pathname.startsWith('/portal')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/portal" element={<StudentPortalPage />} />
                <Route path="/portal/slip" element={<StudentPortalPage />} />
                <Route path="/examinations" element={<ExaminationsPage />} />
                <Route path="/students" element={<StudentsPage />} />
                <Route path="/students/:id" element={<StudentDetailPage />} />
                <Route path="/subjects" element={<SubjectsPage />} />
                <Route path="/classes" element={<ClassesPage />} />
                <Route path="/scores" element={<ScoreEntryPage />} />
                <Route path="/scores/omr" element={<OMRScannerPage />} />
                <Route path="/scores/omr/templates" element={<OMRTemplatePage />} />
                <Route path="/results" element={<ResultsPage />} />
                <Route path="/analytics" element={<MockIntelligencePage />} />
                <Route path="/reports" element={<ReportsPage />} />

                {/* Admin only pages */}
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute adminOnly>
                      <UsersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/audit-logs"
                  element={
                    <ProtectedRoute adminOnly>
                      <AuditLogsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute adminOnly>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
