import React from 'react';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  textColor?: string;
  standalone?: boolean; // Just the emblem without container box
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  className = '',
  showText = false,
  textColor = 'text-white',
  standalone = false,
}) => {
  // Dimension definitions
  const badgeSizeMap = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-20 h-20 rounded-2xl',
  };

  const svgPixelMap = {
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
  };

  const px = svgPixelMap[size];

  // SVG graphic representing the exact metallic "OR" monogram on cobalt blue
  const EmblemSVG = (
    <svg
      viewBox="0 0 460 300"
      className="w-full h-full overflow-visible drop-shadow-md select-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Brushed Silver Metallic Gradients */}
        <linearGradient id="metalGradMain" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="20%" stopColor="#CBD5E1" />
          <stop offset="45%" stopColor="#94A3B8" />
          <stop offset="55%" stopColor="#E2E8F0" />
          <stop offset="75%" stopColor="#64748B" />
          <stop offset="90%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>

        <linearGradient id="metalGradHighlight" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="35%" stopColor="#E2E8F0" stopOpacity="0.6" />
          <stop offset="70%" stopColor="#94A3B8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#F8FAFC" stopOpacity="0.8" />
        </linearGradient>

        <linearGradient id="metalRGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="25%" stopColor="#E2E8F0" />
          <stop offset="50%" stopColor="#94A3B8" />
          <stop offset="75%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>

        {/* Deep 3D Drop Shadow */}
        <filter id="metalShadow" x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="3" dy="12" stdDeviation="10" floodColor="#001845" floodOpacity="0.85" />
          <feDropShadow dx="1" dy="4" stdDeviation="4" floodColor="#000c24" floodOpacity="0.9" />
        </filter>

        {/* Shadow cast by O onto R */}
        <filter id="overlapShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="8" dy="2" stdDeviation="6" floodColor="#001233" floodOpacity="0.9" />
        </filter>
      </defs>

      {/* --- LETTER "R" (Positioned behind O) --- */}
      <g filter="url(#metalShadow)">
        <path
          d={`
            M 210,58
            C 225,58 245,58 275,58
            C 318,58 350,68 368,90
            C 382,107 388,127 388,148
            C 388,185 365,208 322,216
            C 336,227 354,244 374,264
            C 390,279 406,288 424,288
            C 412,284 398,272 388,255
            C 374,233 355,204 330,192
            C 320,188 308,186 288,186
            L 288,245
            L 225,245
            L 225,225
            C 246,195 258,162 258,125
            C 258,95 248,72 230,58
            Z
          `}
          fill="url(#metalRGrad)"
          stroke="#94A3B8"
          strokeWidth="1.2"
        />

        {/* Inner Counter / Hole of "R" */}
        <path
          d={`
            M 288,102
            L 288,146
            C 305,146 325,146 338,142
            C 348,139 352,132 352,124
            C 352,112 344,106 332,103
            C 322,102 305,102 288,102
            Z
          `}
          fill="#0c3c9e" // Matches deep blue background cut
        />
      </g>

      {/* --- LETTER "O" (In foreground, overlapping R) --- */}
      <g filter="url(#metalShadow)">
        {/* Outer Ring of O */}
        <path
          fillRule="evenodd"
          d={`
            M 178,58
            C 245,58 290,102 290,173
            C 290,244 245,288 178,288
            C 111,288 66,244 66,173
            C 66,102 111,58 178,58
            Z
            M 178,105
            C 142,105 119,132 119,173
            C 119,214 142,241 178,241
            C 214,241 237,214 237,173
            C 237,132 214,105 178,105
            Z
          `}
          fill="url(#metalGradMain)"
          stroke="#94A3B8"
          strokeWidth="1.2"
        />

        {/* Subtle Specular Sheen Over O */}
        <path
          fillRule="evenodd"
          d={`
            M 178,60
            C 240,60 285,103 285,173
            C 285,190 280,208 270,225
            C 260,180 230,120 178,110
            C 130,120 100,180 90,225
            C 75,200 71,185 71,173
            C 71,103 116,60 178,60
            Z
          `}
          fill="url(#metalGradHighlight)"
          opacity="0.5"
        />
      </g>
    </svg>
  );

  if (standalone) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        {EmblemSVG}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Cobalt Blue Squircle Badge exactly matching the reference background */}
      <div
        className={`relative flex items-center justify-center shrink-0 select-none transition-transform duration-300 hover:scale-105 shadow-xl ${badgeSizeMap[size]}`}
        style={{
          background: 'linear-gradient(145deg, #0d46b8 0%, #093796 55%, #05266e 100%)',
          boxShadow: '0 8px 24px -3px rgba(9, 55, 150, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
        }}
      >
        <div className="w-[88%] h-[88%] flex items-center justify-center">
          {EmblemSVG}
        </div>
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
