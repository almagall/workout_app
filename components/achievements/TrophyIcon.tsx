'use client'

interface TrophyIconProps {
  className?: string
}

export default function TrophyIcon({ className = 'w-14 h-14' }: TrophyIconProps) {
  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="trophyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="shineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.8)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Trophy base/stand */}
        <rect x="35" y="75" width="30" height="8" rx="2" fill="url(#trophyGradient)" filter="url(#glow)" />
        <rect x="45" y="65" width="10" height="10" fill="url(#trophyGradient)" filter="url(#glow)" />

        {/* Trophy cup */}
        <path
          d="M 30 25 L 25 45 Q 25 55 35 58 L 35 65 L 65 65 L 65 58 Q 75 55 75 45 L 70 25 Z"
          fill="url(#trophyGradient)"
          filter="url(#glow)"
        />

        {/* Left handle */}
        <path
          d="M 25 30 Q 15 30 15 38 Q 15 46 25 46"
          stroke="url(#trophyGradient)"
          strokeWidth="3"
          fill="none"
          filter="url(#glow)"
        />

        {/* Right handle */}
        <path
          d="M 75 30 Q 85 30 85 38 Q 85 46 75 46"
          stroke="url(#trophyGradient)"
          strokeWidth="3"
          fill="none"
          filter="url(#glow)"
        />
      </svg>
    </div>
  )
}
