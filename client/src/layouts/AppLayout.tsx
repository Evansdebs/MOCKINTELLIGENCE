import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  BookOpen,
  Edit3,
  FileText,
  BarChart3,
  Printer,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
  UserCheck,
  TrendingUp,
  Sparkles,
  School,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AppLayout: React.FC = () => {
  const { user, logout, isAdmin, isTeacher, isManagement } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('mockIntelDarkMode') === 'true';
  });

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mockIntelDarkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mockIntelDarkMode', 'false');
    }
  }, [darkMode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/students?search=${encodeURIComponent(globalSearch.trim())}`);
      setGlobalSearch('');
      setMobileMenuOpen(false);
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    {
      label: 'Examinations',
      path: '/examinations',
      icon: Calendar,
    },
    {
      label: 'Students',
      path: '/students',
      icon: Users,
    },
    { label: 'Subjects', path: '/subjects', icon: BookOpen },
    { label: 'Classes', path: '/classes', icon: School },
    {
      label: 'Score Entry',
      path: '/scores',
      icon: Edit3,
    },
    {
      label: 'Results & Slips',
      path: '/results',
      icon: FileText,
    },
    {
      label: 'Mock Intelligence',
      path: '/analytics',
      icon: TrendingUp,
      badge: 'Core',
    },
    { label: 'Reports', path: '/reports', icon: Printer },
    ...(isAdmin ? [{ label: 'Users', path: '/users', icon: UserCheck }] : []),
    ...(isAdmin ? [{ label: 'Audit Logs', path: '/audit-logs', icon: ShieldCheck }] : []),
    ...(isAdmin ? [{ label: 'Settings', path: '/settings', icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="print:hidden hidden md:flex flex-col w-72 bg-slate-900 text-slate-200 border-r border-slate-800 shrink-0 select-none">
        {/* Brand */}
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-white leading-tight">
                MOCK INTEL
              </h1>
              <p className="text-[11px] text-blue-400 font-medium">Basic 9 BECE Analytics</p>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center font-bold text-sm shrink-0">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <span className="inline-block px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider rounded bg-slate-800 text-blue-400 border border-slate-700">
                  {user?.role}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Log Out"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="print:hidden md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-none">MOCK INTEL</h1>
            <p className="text-[10px] text-blue-400">Basic 9 BECE</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white rounded-lg focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900 text-slate-200 pt-16 flex flex-col p-4">
          <form onSubmit={handleSearchSubmit} className="mb-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search students, index, exam..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>

          <nav className="flex-1 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm ${
                      isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-300">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{user?.name}</p>
              <p className="text-xs text-blue-400">{user?.role}</p>
            </div>
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 text-rose-400 bg-rose-500/10 rounded-lg text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <div className="print:hidden hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200/80 sticky top-0 z-30">
          {/* Global Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search students by name, index number..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </form>

          {/* Right quick stats / actions */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
              <School className="w-4 h-4 text-blue-600" />
              <span>Basic 9 BECE Prep (2025/2026)</span>
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Logged in as:</span>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                {user?.name?.split(' ')[0]} ({user?.role})
              </span>
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <button
              onClick={() => setDarkMode(!darkMode)}
              title="Toggle Dark Mode"
              className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-lg dark:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Page View Body */}
        <div className="p-4 md:p-8 flex-1 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
