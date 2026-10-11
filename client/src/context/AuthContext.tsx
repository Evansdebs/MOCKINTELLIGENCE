import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  studentLogin: (credentials: { indexNumber: string; studentId: string }) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isTeacher: boolean;
  isManagement: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('mock_intel_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('mock_intel_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function checkAuth() {
      if (token) {
        try {
          const res = await api.me();
          setUser(res.user);
          localStorage.setItem('mock_intel_user', JSON.stringify(res.user));
        } catch (err) {
          logout();
        }
      }
      setIsLoading(false);
    }
    checkAuth();
  }, [token]);

  const login = async (credentials: { username: string; password: string }) => {
    // 1. Attempt Supabase Auth login if input looks like an email or Supabase is configured
    try {
      const { data: supaData, error: supaError } = await supabase.auth.signInWithPassword({
        email: credentials.username.trim(),
        password: credentials.password,
      });

      if (!supaError && supaData?.session?.access_token) {
        const supaToken = supaData.session.access_token;
        localStorage.setItem('mock_intel_token', supaToken);
        setToken(supaToken);

        const profileRes = await api.me();
        setUser(profileRes.user);
        localStorage.setItem('mock_intel_user', JSON.stringify(profileRes.user));
        return;
      }
    } catch (e) {
      // Proceed to legacy login fallback if Supabase Auth login fails or user entered a username
    }

    // 2. Legacy login fallback (prior to global sunset date)
    const res = await api.login(credentials);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('mock_intel_token', res.token);
    localStorage.setItem('mock_intel_user', JSON.stringify(res.user));
  };

  const studentLogin = async (credentials: { indexNumber: string; studentId: string }) => {
    const res = await api.studentLogin(credentials);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('mock_intel_token', res.token);
    localStorage.setItem('mock_intel_user', JSON.stringify(res.user));
  };

  const logout = () => {
    supabase.auth.signOut().catch(() => {});
    setToken(null);
    setUser(null);
    localStorage.removeItem('mock_intel_token');
    localStorage.removeItem('mock_intel_user');
  };

  const isAdmin = user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';
  const isManagement = user?.role === 'MANAGEMENT';
  const isStudent = user?.role === 'STUDENT';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        studentLogin,
        logout,
        isAdmin,
        isTeacher,
        isManagement,
        isStudent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
