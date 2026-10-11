import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  textColor?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  className = '',
  showText = false,
  textColor = 'text-white',
}) => {
  const { themeColor } = useTheme();

  // Size mappings for badge
  const sizeMap = {
    sm: 'w-8 h-8 rounded-lg text-xs',
    md: 'w-10 h-10 rounded-xl text-sm',
    lg: 'w-12 h-12 rounded-2xl text-base',
    xl: 'w-16 h-16 rounded-2xl text-lg',
  };

  const svgDimensions = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  };

  const dim = svgDimensions[size];

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Modern Designed "OR" Monogram Badge */}
      <div
        className={`relative flex items-center justify-center shrink-0 select-none transition-transform duration-300 hover:scale-105 shadow-md ${sizeMap[size]}`}
        style={{
          background: themeColor 
            ? `linear-gradient(135deg, ${themeColor} 0%, #1D4ED8 100%)`
            : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 60%, #1E40AF 100%)',
          boxShadow: '0 4px 14px -2px rgba(37, 99, 235, 0.35)',
        }}
      >
        {/* Subtle glossy glass highlight on top */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-white/15 rounded-t-[inherit] pointer-events-none" />

        {/* Clean, Bold, Geometric "OR" Vector Emblem */}
        <svg
          viewBox="0 0 100 100"
          width={dim * 0.75}
          height={dim * 0.75}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          {/* Subtle drop shadow */}
          <defs>
            <filter id="cleanShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#0F172A" floodOpacity="0.25" />
            </filter>
            <linearGradient id="whiteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#F1F5F9" />
            </linearGradient>
          </defs>

          {/* Letter "O": Thick, clean modern geometric ring */}
          <path
            d="M 31,23 
               C 17,23 7,34 7,50 
               C 7,66 17,77 31,77 
               C 45,77 55,66 55,50 
               C 55,34 45,23 31,23 Z 
               M 31,35 
               C 39,35 44,41 44,50 
               C 44,59 39,65 31,65 
               C 23,65 18,59 18,50 
               C 18,41 23,35 31,35 Z"
            fill="url(#whiteGrad)"
            filter="url(#cleanShadow)"
          />

          {/* Letter "R": Confident modern architectural typography */}
          {/* Vertical Stem */}
          <path
            d="M 52,23 L 63,23 L 63,77 L 52,77 Z"
            fill="url(#whiteGrad)"
            filter="url(#cleanShadow)"
          />

          {/* Loop / Upper Bowl */}
          <path
            d="M 63,23 
               L 78,23 
               C 88,23 94,29 94,38 
               C 94,47 88,53 78,53 
               L 63,53 Z 
               M 63,34 
               L 77,34 
               C 81,34 83,36 83,38 
               C 83,40 81,42 77,42 
               L 63,42 Z"
            fill="url(#whiteGrad)"
            filter="url(#cleanShadow)"
          />

          {/* Angular Dynamic Leg / Kick */}
          <path
            d="M 73,50 
               L 93,77 
               L 81,77 
               L 64,52 Z"
            fill="url(#whiteGrad)"
            filter="url(#cleanShadow)"
          />
        </svg>

        <span className="sr-only">ONEREAL OR Logo</span>
      </div>

      {showText && (
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight text-base ${textColor}`}>
              ONEREAL
            </span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-blue-600 text-white shadow-xs">
              B9
            </span>
          </div>
          <p className="text-[10px] text-blue-400 font-medium tracking-wide">
            Mock Performance Intelligence
          </p>
        </div>
      )}
    </div>
  );
};
