import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

export type SystemThemeColor = 'blue' | 'indigo' | 'emerald' | 'violet' | 'amber' | 'rose' | 'teal' | 'slate';

export interface ThemePreset {
  id: SystemThemeColor;
  name: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  ring: string;
}

export const THEME_PRESETS: Record<SystemThemeColor, ThemePreset> = {
  blue: {
    id: 'blue',
    name: 'Classic Blue',
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    primaryLight: '#eff6ff',
    ring: 'rgba(37, 99, 235, 0.35)',
  },
  indigo: {
    id: 'indigo',
    name: 'Academic Indigo',
    primary: '#4f46e5',
    primaryHover: '#4338ca',
    primaryLight: '#eef2ff',
    ring: 'rgba(79, 70, 229, 0.35)',
  },
  emerald: {
    id: 'emerald',
    name: 'Excellence Green',
    primary: '#059669',
    primaryHover: '#047857',
    primaryLight: '#ecfdf5',
    ring: 'rgba(5, 150, 105, 0.35)',
  },
  violet: {
    id: 'violet',
    name: 'Royal Purple',
    primary: '#7c3aed',
    primaryHover: '#6d28d9',
    primaryLight: '#f5f3ff',
    ring: 'rgba(124, 58, 237, 0.35)',
  },
  teal: {
    id: 'teal',
    name: 'Ocean Teal',
    primary: '#0d9488',
    primaryHover: '#0f766e',
    primaryLight: '#f0fdfa',
    ring: 'rgba(13, 148, 136, 0.35)',
  },
  amber: {
    id: 'amber',
    name: 'Gold Amber',
    primary: '#d97706',
    primaryHover: '#b45309',
    primaryLight: '#fffbeb',
    ring: 'rgba(217, 119, 6, 0.35)',
  },
  rose: {
    id: 'rose',
    name: 'Crimson Rose',
    primary: '#e11d48',
    primaryHover: '#be123c',
    primaryLight: '#fff1f2',
    ring: 'rgba(225, 29, 72, 0.35)',
  },
  slate: {
    id: 'slate',
    name: 'Executive Slate',
    primary: '#334155',
    primaryHover: '#1e293b',
    primaryLight: '#f8fafc',
    ring: 'rgba(51, 65, 85, 0.35)',
  },
};

interface ThemeContextType {
  themeColor: SystemThemeColor;
  setThemeColor: (color: SystemThemeColor) => void;
  applyTheme: (color: SystemThemeColor) => void;
  presets: ThemePreset[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function applyThemeToDOM(color: SystemThemeColor) {
  const preset = THEME_PRESETS[color] || THEME_PRESETS.blue;
  const root = document.documentElement;
  root.setAttribute('data-theme', color);
  root.style.setProperty('--theme-primary', preset.primary);
  root.style.setProperty('--theme-primary-hover', preset.primaryHover);
  root.style.setProperty('--theme-primary-light', preset.primaryLight);
  root.style.setProperty('--theme-primary-ring', preset.ring);
  localStorage.setItem('mock_intel_system_theme', color);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeColor, setThemeColorState] = useState<SystemThemeColor>(() => {
    const saved = localStorage.getItem('mock_intel_system_theme') as SystemThemeColor;
    return saved && THEME_PRESETS[saved] ? saved : 'blue';
  });

  const applyTheme = (color: SystemThemeColor) => {
    if (THEME_PRESETS[color]) {
      setThemeColorState(color);
      applyThemeToDOM(color);
    }
  };

  useEffect(() => {
    applyThemeToDOM(themeColor);

    api.getPublicSettings()
      .then((res) => {
        if (res?.settings?.primaryColor && THEME_PRESETS[res.settings.primaryColor as SystemThemeColor]) {
          const remoteColor = res.settings.primaryColor as SystemThemeColor;
          setThemeColorState(remoteColor);
          applyThemeToDOM(remoteColor);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        themeColor,
        setThemeColor: setThemeColorState,
        applyTheme,
        presets: Object.values(THEME_PRESETS),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};