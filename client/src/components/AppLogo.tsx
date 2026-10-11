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
    lg: 'w-13 h-13 rounded-2xl text-base',
    xl: 'w-16 h-16 rounded-2xl text-lg',
  };

  const svgDimensions = {
    sm: { width: 32, height: 32 },
    md: { width: 40, height: 40 },
    lg: { width: 52, height: 52 },
    xl: { width: 64, height: 64 },
  };

  const dim = svgDimensions[size];

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Designed "OR" Monogram Badge */}
      <div
        className={`relative flex items-center justify-center shrink-0 shadow-lg select-none transition-transform duration-300 hover:scale-105 ${sizeMap[size]}`}
        style={{
          background: `linear-gradient(135deg, ${themeColor || '#2563EB'} 0%, #4F46E5 50%, #7C3AED 100%)`,
          boxShadow: `0 8px 20px -4px ${themeColor ? themeColor + '55' : 'rgba(79, 70, 229, 0.35)'}`,
        }}
      >
        {/* Subtle glossy glass highlight on top edge */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 rounded-t-[inherit] pointer-events-none" />

        {/* Vector Designed "OR" Monogram */}
        <svg
          viewBox="0 0 100 100"
          width={dim.width * 0.72}
          height={dim.height * 0.72}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-sm overflow-visible"
        >
          <defs>
            {/* Soft inner glow gradient */}
            <linearGradient id="orGradO" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E0E7FF" />
            </linearGradient>
            <linearGradient id="orGradR" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#C7D2FE" />
            </linearGradient>
            <filter id="shadowFilter" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#1E1B4B" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Letter "O" - Bold Modern Geometric Ring */}
          <path
            d="M 32,20 
               C 17,20 8,32 8,50 
               C 8,68 17,80 32,80 
               C 42,80 49,74 53,65 
               L 43,60 
               C 40,66 36,70 32,70 
               C 23,70 18,61 18,50 
               C 18,39 23,30 32,30 
               C 39,30 43,35 46,42 
               L 55,36 
               C 50,26 43,20 32,20 Z"
            fill="url(#orGradO)"
            filter="url(#shadowFilter)"
          />

          {/* Letter "R" - Sleek interlocked letter with dynamic diagonal kicker */}
          {/* Vertical Stem */}
          <path
            d="M 45,21 
               L 55,21 
               L 55,79 
               L 45,79 Z"
            fill="url(#orGradR)"
            filter="url(#shadowFilter)"
          />

          {/* "R" Loop / Bow */}
          <path
            d="M 54,21 
               L 72,21 
               C 84,21 91,28 91,38 
               C 91,48 83,55 71,55 
               L 54,55 Z 
               M 55,31 
               L 70,31 
               C 77,31 80,34 80,38 
               C 80,42 77,45 70,45 
               L 55,45 Z"
            fill="url(#orGradR)"
            filter="url(#shadowFilter)"
          />

          {/* "R" Dynamic Forward Kicker / Leg */}
          <path
            d="M 68,52 
               L 88,79 
               L 77,79 
               L 59,54 
               Z"
            fill="#FFFFFF"
            filter="url(#shadowFilter)"
          />

          {/* Little spark dot / accent on the R kick */}
          <circle cx="89" cy="74" r="2.2" fill="#FDE047" />
        </svg>

        {/* Mini Sub-tag badge */}
        <span className="sr-only">ONEREAL OR Logo</span>
      </div>

      {showText && (
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight text-base ${textColor}`}>
              ONEREAL
            </span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-400 text-slate-900 shadow-xs">
              B9
            </span>
          </div>
          <p className="text-[10px] text-blue-400/90 font-medium tracking-wide">
            Mock Performance Intelligence
          </p>
        </div>
      )}
    </div>
  );
};
