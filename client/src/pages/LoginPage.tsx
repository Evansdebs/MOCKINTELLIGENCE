import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Lock, User as UserIcon, Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles, School, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { BearAvatar } from '../components/BearAvatar';
import { AppLogo } from '../components/AppLogo';

export const LoginPage: React.FC = () => {
  const { login, studentLogin } = useAuth();
  const { presets, themeColor } = useTheme();
  const navigate = useNavigate();

  const [loginType, setLoginType] = useState<'staff' | 'student'>('staff');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [indexNumber, setIndexNumber] = useState('');
  const [studentId, setStudentId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mascot Focus States
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Parallax Coordinates for subtle card depth
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (loginType === 'staff') {
        await login({ username, password });
        navigate('/dashboard');
      } else {
        await studentLogin({ indexNumber, studentId });
        navigate('/portal');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get active username length for tracking
  const currentUsernameLength = loginType === 'staff' ? username.length : indexNumber.length;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="min-h-screen bg-gradient-to-br from-amber-50/50 via-sky-50/50 to-indigo-50/60 bg-light-dots flex items-center justify-center p-4 relative overflow-hidden select-none"
    >
      {/* Soft Ambient Pastel Glow Orbs */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full bg-sky-200/40 blur-[110px] pointer-events-none animate-float-slow transition-transform duration-700 ease-out"
        style={{
          top: '10%',
          left: '12%',
          transform: `translate(${mousePos.x * -35}px, ${mousePos.y * -35}px)`,
        }}
      />
      <div
        className="absolute w-[460px] h-[460px] rounded-full bg-indigo-200/35 blur-[120px] pointer-events-none animate-float-reverse transition-transform duration-700 ease-out"
        style={{
          bottom: '8%',
          right: '12%',
          transform: `translate(${mousePos.x * 40}px, ${mousePos.y * 40}px)`,
        }}
      />
      <div
        className="absolute w-[360px] h-[360px] rounded-full bg-amber-200/35 blur-[95px] pointer-events-none animate-pulse-glow"
        style={{
          top: '45%',
          right: '30%',
        }}
      />

      {/* Main Container with 3D Tilt */}
      <div
        className="w-full max-w-md relative z-10 transition-transform duration-300 ease-out"
        style={{
          transform: `perspective(1000px) rotateY(${mousePos.x * 4}deg) rotateX(${mousePos.y * -4}deg)`,
        }}
      >
        {/* Top Status Pill */}
        <div className="flex justify-center mb-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200/80 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="tracking-wide">ONEREAL Mock Intelligence Engine</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
        </div>

        {/* Mascot Bear Avatar sitting happily on top of the card */}
        <div className="relative -mb-3 z-20">
          <BearAvatar
            isUsernameFocused={isUsernameFocused}
            isPasswordFocused={isPasswordFocused}
            showPassword={showPassword}
            usernameLength={currentUsernameLength}
            isSubmitting={isLoading}
          />
        </div>

        {/* Light Glassmorphism Login Card */}
        <div className="relative rounded-3xl p-6 md:p-8 shadow-2xl shadow-indigo-100/70 backdrop-blur-xl bg-blue-50/95 border border-slate-200/90 ring-1 ring-slate-100">
          {/* Brand Header */}
          <div className="text-center mb-6">
            <div className="relative inline-block mb-3">
              <AppLogo size="xl" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-800 text-[9px] font-black shadow-xs">
                B9
              </div>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-blue-600 tracking-tight">
              ONEREAL MOCK PERFORMANCE INTELLIGENCE
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Basic 9 Examination Diagnostics & Performance Analytics
            </p>
          </div>

          {/* Clean Segmented Tab Switcher */}
          <div className="relative flex bg-slate-100/90 rounded-2xl p-1 mb-5 border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setLoginType('staff');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                loginType === 'staff'
                  ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <School className="w-3.5 h-3.5" />
              <span>Staff Login</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginType('student');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                loginType === 'student'
                  ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Portal</span>
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2.5 animate-fadeIn">
              <ShieldCheck className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {loginType === 'staff' ? (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Username or Email
                  </label>
                  <div className="relative group">
                    <UserIcon className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 absolute left-3.5 top-3.5 transition-colors" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => {
                        setIsUsernameFocused(true);
                        setIsPasswordFocused(false);
                      }}
                      onBlur={() => setIsUsernameFocused(false)}
                      placeholder="e.g. araba or teacher evans"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-3 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-inner/5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 absolute left-3.5 top-3.5 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => {
                        setIsPasswordFocused(true);
                        setIsUsernameFocused(false);
                      }}
                      onBlur={() => setIsPasswordFocused(false)}
                      placeholder="Enter password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-3 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-inner/5"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 transition-colors"
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Candidate Index Number
                  </label>
                  <div className="relative group">
                    <UserIcon className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 absolute left-3.5 top-3.5 transition-colors" />
                    <input
                      type="text"
                      required
                      value={indexNumber}
                      onChange={(e) => setIndexNumber(e.target.value)}
                      onFocus={() => {
                        setIsUsernameFocused(true);
                        setIsPasswordFocused(false);
                      }}
                      onBlur={() => setIsUsernameFocused(false)}
                      placeholder="e.g. 010203001"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-3 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-inner/5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Student ID Code
                  </label>
                  <div className="relative group">
                    <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 absolute left-3.5 top-3.5 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      onFocus={() => {
                        setIsPasswordFocused(true);
                        setIsUsernameFocused(false);
                      }}
                      onBlur={() => setIsPasswordFocused(false)}
                      placeholder="e.g. ACH/B9/001"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-3 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-inner/5"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 transition-colors"
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{ backgroundColor: themeColor }}
              className="w-full mt-2 py-3 px-4 hover:opacity-90 text-black font-bold text-xs md:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-50 active:scale-[0.98]"
            >
              <span>{isLoading ? 'Authenticating...' : loginType === 'staff' ? 'Sign In to Staff Portal' : 'Access Student Results'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>

        {/* Friendly Footer */}
        <div className="text-center mt-5 space-y-1">
          <p className="text-[11px] text-slate-500 font-medium">
            BECE Candidate Performance & Diagnostic Portal
          </p>
          <p className="text-[10px] text-slate-400">
            Powered by OneReal IT Consult
          </p>
        </div>
      </div>
    </div>
  );
};
