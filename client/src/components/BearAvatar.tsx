import React, { useEffect, useState } from 'react';

interface BearAvatarProps {
  isUsernameFocused: boolean;
  isPasswordFocused: boolean;
  showPassword?: boolean;
  usernameLength?: number;
  isSubmitting?: boolean;
  className?: string;
}

export const BearAvatar: React.FC<BearAvatarProps> = ({
  isUsernameFocused,
  isPasswordFocused,
  showPassword = false,
  usernameLength = 0,
  isSubmitting = false,
  className = 'w-36 h-30',
}) => {
  const [blink, setBlink] = useState(false);

  // Periodic natural blinking when not covering eyes
  useEffect(() => {
    if (isPasswordFocused) return;
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 180);
    }, 3500 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [isPasswordFocused]);

  // Calculate pupil tracking based on username length (shifts slightly left-to-right & down)
  const pupilOffsetX = Math.min(Math.max((usernameLength - 6) * 0.45, -4), 4);
  const pupilOffsetY = isUsernameFocused ? 3.5 : 0;

  // Determine state
  const isCoveringEyes = isPasswordFocused && !showPassword;
  const isPeeking = isPasswordFocused && showPassword;
  const isSmiling = isUsernameFocused || usernameLength > 0;

  return (
    <div className={`relative ${className} mx-auto flex items-end justify-center select-none pointer-events-none`}>
      <svg
        viewBox="0 0 200 170"
        className="w-full h-full overflow-visible drop-shadow-md"
      >
        <defs>
          <radialGradient id="bearBodyGrad" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#CA8A04" />
            <stop offset="70%" stopColor="#A16207" />
            <stop offset="100%" stopColor="#854D0E" />
          </radialGradient>
          <radialGradient id="earInnerGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FED7AA" />
            <stop offset="100%" stopColor="#FDBA74" />
          </radialGradient>
          <linearGradient id="snoutGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFBEB" />
            <stop offset="100%" stopColor="#FEF3C7" />
          </linearGradient>
          <filter id="cheekGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. EARS */}
        {/* Left Ear */}
        <g className="transition-transform duration-300 origin-[50px_60px]" style={{
          transform: isSmiling ? 'rotate(-4deg)' : isCoveringEyes ? 'rotate(-8deg)' : 'rotate(0deg)'
        }}>
          <circle cx="52" cy="56" r="23" fill="url(#bearBodyGrad)" stroke="#78350F" strokeWidth="2.5" />
          <circle cx="52" cy="56" r="14" fill="url(#earInnerGrad)" />
        </g>
        {/* Right Ear */}
        <g className="transition-transform duration-300 origin-[150px_60px]" style={{
          transform: isSmiling ? 'rotate(4deg)' : isCoveringEyes ? 'rotate(8deg)' : 'rotate(0deg)'
        }}>
          <circle cx="148" cy="56" r="23" fill="url(#bearBodyGrad)" stroke="#78350F" strokeWidth="2.5" />
          <circle cx="148" cy="56" r="14" fill="url(#earInnerGrad)" />
        </g>

        {/* 2. HEAD BASE */}
        <ellipse
          cx="100"
          cy="95"
          rx="66"
          ry="58"
          fill="url(#bearBodyGrad)"
          stroke="#78350F"
          strokeWidth="3"
        />

        {/* Little Head Tuft */}
        <path
          d="M 94,40 C 97,32 103,32 106,40 C 109,33 113,34 114,42"
          fill="none"
          stroke="#78350F"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* 3. BLUSHING CHEEKS */}
        {/* Left Cheek */}
        <ellipse
          cx="62"
          cy="104"
          rx={isSmiling ? "9" : "7"}
          ry={isSmiling ? "6.5" : "5"}
          fill="#FB7185"
          opacity={isSmiling ? 0.75 : 0.4}
          filter="url(#cheekGlow)"
          className="transition-all duration-300"
        />
        {/* Right Cheek */}
        <ellipse
          cx="138"
          cy="104"
          rx={isSmiling ? "9" : "7"}
          ry={isSmiling ? "6.5" : "5"}
          fill="#FB7185"
          opacity={isSmiling ? 0.75 : 0.4}
          filter="url(#cheekGlow)"
          className="transition-all duration-300"
        />

        {/* 4. EYES */}
        {/* When Password is entered and NOT showing password: Closed eyes / Squint happy arcs */}
        {isCoveringEyes ? (
          <g>
            {/* Left closed eye (cute relaxed arc) */}
            <path
              d="M 68,88 Q 78,98 88,88"
              fill="none"
              stroke="#451A03"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Right closed eye */}
            <path
              d="M 112,88 Q 122,98 132,88"
              fill="none"
              stroke="#451A03"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>
        ) : isPeeking ? (
          // Peeking state: One eye tightly shut or squinting, other eye wide and curious
          <g>
            {/* Left eye peeking */}
            <circle cx="78" cy="88" r="9" fill="#1E293B" />
            <circle cx="80" cy="85" r="3.2" fill="#FFFFFF" />
            <circle cx="76" cy="90" r="1.5" fill="#FFFFFF" />
            {/* Right eye playful squint */}
            <path
              d="M 114,88 Q 123,96 132,88"
              fill="none"
              stroke="#451A03"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>
        ) : blink ? (
          // Blinking state
          <g>
            <path
              d="M 69,89 Q 78,93 87,89"
              fill="none"
              stroke="#451A03"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M 113,89 Q 122,93 131,89"
              fill="none"
              stroke="#451A03"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        ) : (
          // Normal / Smiling / Tracking Eyes
          <g>
            {/* Left Eye Socket / White */}
            <circle cx="78" cy="87" r="10" fill="#FFFFFF" stroke="#78350F" strokeWidth="1.5" />
            {/* Left Pupil (Tracks typing position) */}
            <g style={{
              transform: `translate(${pupilOffsetX}px, ${pupilOffsetY}px)`,
              transition: 'transform 0.15s ease-out'
            }}>
              <circle cx="78" cy="87" r="6.5" fill="#1E293B" />
              {/* Highlight */}
              <circle cx="76" cy="85" r="2.4" fill="#FFFFFF" />
              <circle cx="80" cy="89" r="1.1" fill="#FFFFFF" />
            </g>

            {/* Right Eye Socket / White */}
            <circle cx="122" cy="87" r="10" fill="#FFFFFF" stroke="#78350F" strokeWidth="1.5" />
            {/* Right Pupil */}
            <g style={{
              transform: `translate(${pupilOffsetX}px, ${pupilOffsetY}px)`,
              transition: 'transform 0.15s ease-out'
            }}>
              <circle cx="122" cy="87" r="6.5" fill="#1E293B" />
              {/* Highlight */}
              <circle cx="120" cy="85" r="2.4" fill="#FFFFFF" />
              <circle cx="124" cy="89" r="1.1" fill="#FFFFFF" />
            </g>

            {/* Eyebrows */}
            <path
              d={isSmiling ? "M 70,74 Q 78,70 86,75" : "M 71,76 Q 78,73 85,76"}
              fill="none"
              stroke="#78350F"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="transition-all duration-200"
            />
            <path
              d={isSmiling ? "M 114,75 Q 122,70 130,74" : "M 115,76 Q 122,73 129,76"}
              fill="none"
              stroke="#78350F"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="transition-all duration-200"
            />
          </g>
        )}

        {/* 5. SNOUT & NOSE */}
        <ellipse
          cx="100"
          cy="114"
          rx="32"
          ry="24"
          fill="url(#snoutGrad)"
          stroke="#78350F"
          strokeWidth="2"
        />

        {/* Nose */}
        <path
          d="M 92,104 C 92,101 108,101 108,104 C 108,109 102,113 100,113 C 98,113 92,109 92,104 Z"
          fill="#1E293B"
        />
        {/* Nose Highlight */}
        <ellipse cx="98" cy="104" rx="2.5" ry="1.2" fill="#94A3B8" />

        {/* Nose to Mouth Line */}
        <line x1="100" y1="113" x2="100" y2="119" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />

        {/* 6. MOUTH / SMILE */}
        {isSmiling ? (
          // Joyful smiling mouth when username entered or focused
          <g className="transition-all duration-300">
            {/* Open Happy Smile */}
            <path
              d="M 87,119 Q 100,135 113,119 Q 100,123 87,119 Z"
              fill="#991B1B"
              stroke="#78350F"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Cute pink tongue inside smile */}
            <path
              d="M 94,127 Q 100,135 106,127 Q 100,125 94,127 Z"
              fill="#F472B6"
            />
          </g>
        ) : isCoveringEyes ? (
          // Shy little straight mouth when closing eyes
          <path
            d="M 93,121 Q 100,123 107,121"
            fill="none"
            stroke="#78350F"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        ) : isSubmitting ? (
          // Determined smile
          <path
            d="M 90,120 Q 100,128 110,120"
            fill="none"
            stroke="#78350F"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ) : (
          // Gentle resting smile
          <path
            d="M 90,120 Q 100,125 110,120"
            fill="none"
            stroke="#78350F"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}

        {/* 7. PAWS (PEEK-A-BOO ANIMATION) */}
        {/* Left Paw */}
        <g
          className="transition-all duration-500 ease-out origin-[60px_160px]"
          style={{
            transform: isCoveringEyes
              ? 'translate(14px, -62px) rotate(18deg)'
              : isPeeking
              ? 'translate(12px, -38px) rotate(10deg)'
              : 'translate(0px, 0px) rotate(0deg)',
          }}
        >
          {/* Paw Arm/Base */}
          <ellipse
            cx="55"
            cy="158"
            rx="22"
            ry="18"
            fill="url(#bearBodyGrad)"
            stroke="#78350F"
            strokeWidth="2.5"
          />
          {/* Main Paw Pad */}
          <ellipse cx="55" cy="156" rx="9" ry="7" fill="#FED7AA" />
          {/* Toe Beans */}
          <circle cx="45" cy="148" r="3" fill="#FED7AA" />
          <circle cx="53" cy="144" r="3.2" fill="#FED7AA" />
          <circle cx="62" cy="145" r="3" fill="#FED7AA" />
          <circle cx="68" cy="151" r="2.8" fill="#FED7AA" />
        </g>

        {/* Right Paw */}
        <g
          className="transition-all duration-500 ease-out origin-[140px_160px]"
          style={{
            transform: isCoveringEyes
              ? 'translate(-14px, -62px) rotate(-18deg)'
              : isPeeking
              ? 'translate(-4px, -15px) rotate(-4deg)'
              : 'translate(0px, 0px) rotate(0deg)',
          }}
        >
          {/* Paw Arm/Base */}
          <ellipse
            cx="145"
            cy="158"
            rx="22"
            ry="18"
            fill="url(#bearBodyGrad)"
            stroke="#78350F"
            strokeWidth="2.5"
          />
          {/* Main Paw Pad */}
          <ellipse cx="145" cy="156" rx="9" ry="7" fill="#FED7AA" />
          {/* Toe Beans */}
          <circle cx="132" cy="151" r="2.8" fill="#FED7AA" />
          <circle cx="138" cy="145" r="3" fill="#FED7AA" />
          <circle cx="147" cy="144" r="3.2" fill="#FED7AA" />
          <circle cx="155" cy="148" r="3" fill="#FED7AA" />
        </g>
      </svg>
    </div>
  );
};
