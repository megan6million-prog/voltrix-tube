// Voltrix Logo — Futuristic electric bolt / volt symbol
// Electric blue thunder aesthetic

interface LogoProps {
  size?: number;
  showText?: boolean;
  textSize?: string;
}

export default function VoltrixLogo({ size = 32, showText = true, textSize = "text-xl" }: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      {/* The Volt icon — electric zigzag bolt */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer glow ring */}
        <circle cx="20" cy="20" r="19" fill="url(#outerGlow)" opacity="0.15" />

        {/* Dark background circle */}
        <circle cx="20" cy="20" r="18" fill="#050d1a" />

        {/* Inner electric ring */}
        <circle cx="20" cy="20" r="17" stroke="url(#ringGradient)" strokeWidth="0.5" opacity="0.6" />

        {/* Main bolt shape — sharp electric V/zigzag */}
        <path
          d="M24 4 L13 20 L19 20 L16 36 L28 18 L21 18 Z"
          fill="url(#boltGradient)"
          filter="url(#glow)"
        />

        {/* Top highlight on bolt */}
        <path
          d="M24 4 L18 15 L21.5 15 Z"
          fill="white"
          opacity="0.4"
        />

        {/* Electric spark top */}
        <circle cx="24" cy="4" r="1.5" fill="#7dd3fc" opacity="0.9" />

        {/* Electric sparks around bolt */}
        <line x1="30" y1="10" x2="33" y2="8" stroke="#38bdf8" strokeWidth="1" opacity="0.7" />
        <line x1="31" y1="14" x2="35" y2="13" stroke="#7dd3fc" strokeWidth="0.8" opacity="0.5" />
        <line x1="10" y1="26" x2="7" y2="28" stroke="#38bdf8" strokeWidth="1" opacity="0.7" />
        <line x1="9" y1="22" x2="5" y2="21" stroke="#7dd3fc" strokeWidth="0.8" opacity="0.5" />

        <defs>
          {/* Main bolt gradient — deep blue to electric cyan */}
          <linearGradient id="boltGradient" x1="16" y1="4" x2="20" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="25%" stopColor="#38bdf8" />
            <stop offset="60%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>

          {/* Ring gradient */}
          <linearGradient id="ringGradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0.3" />
          </linearGradient>

          {/* Outer glow */}
          <radialGradient id="outerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
          </radialGradient>

          {/* Bolt glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Brand name */}
      {showText && (
        <span className={`font-black tracking-tight ${textSize} bg-gradient-to-r from-sky-300 via-blue-400 to-blue-600 bg-clip-text text-transparent`}>
          Voltrix
        </span>
      )}
    </div>
  );
}
