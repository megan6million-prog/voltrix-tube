// Volt — AI assistant icon (mini bolt)
interface VoltIconProps {
  size?: number;
  className?: string;
}

export default function VoltIcon({ size = 20, className = "" }: VoltIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M14 2 L7 13 L11 13 L10 22 L18 11 L13 11 Z"
        fill="url(#voltGrad)"
        filter="url(#voltGlow)"
      />
      <defs>
        <linearGradient id="voltGrad" x1="10" y1="2" x2="13" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="40%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <filter id="voltGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
