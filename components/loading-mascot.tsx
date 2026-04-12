"use client"

export function LoadingMascot() {
  return (
    <div className="flex items-center gap-3 py-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 160 82"
        width="80"
        height="41"
        className="shrink-0"
      >
        <style>{`
          .right-arm {
            animation: arm-idle 2s ease-in-out infinite;
            transform-origin: 86px 40px;
          }
          .eye {
            animation: blink 3s ease-in-out infinite;
          }
          .right-leg {
            animation: kick-leg 2s ease-in-out infinite;
            transform-origin: 70px 60px;
          }
          .football {
            animation: ball-travel 2s ease-in-out infinite;
          }
          @keyframes arm-idle {
            0%, 100% { transform: rotate(-2deg); }
            50% { transform: rotate(2deg); }
          }
          @keyframes blink {
            0%, 45%, 55%, 100% { transform: scaleY(1); }
            50% { transform: scaleY(0.1); }
          }
          @keyframes kick-leg {
            0%, 10% { transform: rotate(0deg); }
            20%, 25% { transform: rotate(-25deg); }
            35%, 100% { transform: rotate(0deg); }
          }
          @keyframes ball-travel {
            0%, 10% { transform: translate(0, 0); }
            20% { transform: translate(5px, -2px); }
            45% { transform: translate(55px, -5px); }
            50% { transform: translate(55px, -5px); }
            80% { transform: translate(5px, -2px); }
            90%, 100% { transform: translate(0, 0); }
          }
        `}</style>

        <defs>
          <radialGradient
            id="ballGradient"
            cx="35%"
            cy="35%"
            r="60%"
            fx="30%"
            fy="30%"
          >
            <stop offset="0%" style={{ stopColor: "#ffffff", stopOpacity: 1 }} />
            <stop offset="70%" style={{ stopColor: "#e8e8e8", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#c0c0c0", stopOpacity: 1 }} />
          </radialGradient>
          <linearGradient
            id="pentagonGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" style={{ stopColor: "#333333", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#000000", stopOpacity: 1 }} />
          </linearGradient>
        </defs>

        {/* Shadow */}
        <ellipse cx="50" cy="82" rx="22" ry="5" fill="#000" opacity="0.25" />

        {/* Claude Character */}
        <g className="claude-body">
          {/* Ears */}
          <rect x="22" y="10" width="8" height="14" fill="#E07C4C" />
          <rect x="70" y="10" width="8" height="14" fill="#E07C4C" />

          {/* Body */}
          <rect x="18" y="24" width="64" height="4" fill="#E07C4C" />
          <rect x="14" y="28" width="72" height="32" fill="#E07C4C" />

          {/* Eyes */}
          <rect
            className="eye"
            x="38"
            y="34"
            width="8"
            height="10"
            fill="#000000"
            style={{ transformOrigin: "42px 39px" }}
          />
          <rect
            className="eye"
            x="68"
            y="34"
            width="8"
            height="10"
            fill="#000000"
            style={{ transformOrigin: "72px 39px" }}
          />

          {/* Arms */}
          <rect x="2" y="36" width="12" height="8" fill="#E07C4C" />
          <rect className="right-arm" x="86" y="36" width="14" height="8" fill="#E07C4C" />

          {/* Left leg + shoe */}
          <rect x="24" y="60" width="12" height="10" fill="#E07C4C" />
          <rect x="22" y="70" width="16" height="6" rx="1" fill="#1a1a1a" />

          {/* Right leg (kicking) + shoe */}
          <g className="right-leg">
            <rect x="64" y="60" width="12" height="10" fill="#E07C4C" />
            <rect x="62" y="70" width="16" height="6" rx="1" fill="#1a1a1a" />
          </g>
        </g>

        {/* Football */}
        <g className="football">
          <ellipse cx="88" cy="82" rx="9" ry="3" fill="#000" opacity="0.2" />
          <circle cx="88" cy="67" r="12" fill="url(#ballGradient)" stroke="#555" strokeWidth="0.5" />
          <clipPath id="ballClip">
            <circle cx="88" cy="67" r="11.5" />
          </clipPath>
          <g clipPath="url(#ballClip)">
            <path d="M88,64 L90,65.5 L89.5,68 L86.5,68 L86,65.5 Z" fill="url(#pentagonGradient)" />
            <path d="M88,56 L90,57.5 L89.5,60 L86.5,60 L86,57.5 Z" fill="url(#pentagonGradient)" />
            <path d="M97,62 L99,65 L98,68 L95.5,67 L96,63.5 Z" fill="url(#pentagonGradient)" />
            <path d="M95,72 L97,75 L94,77.5 L91,75 L93,72 Z" fill="url(#pentagonGradient)" />
            <path d="M81,72 L83,75 L80,77.5 L77,75 L79,72 Z" fill="url(#pentagonGradient)" />
            <path d="M79,62 L80,63.5 L79.5,67 L77,68 L76,65 Z" fill="url(#pentagonGradient)" />
            <line x1="88" y1="64" x2="88" y2="56" stroke="#666" strokeWidth="0.4" />
            <line x1="90" y1="65.5" x2="97" y2="62" stroke="#666" strokeWidth="0.4" />
            <line x1="89.5" y1="68" x2="95" y2="72" stroke="#666" strokeWidth="0.4" />
            <line x1="86.5" y1="68" x2="81" y2="72" stroke="#666" strokeWidth="0.4" />
            <line x1="86" y1="65.5" x2="79" y2="62" stroke="#666" strokeWidth="0.4" />
            <ellipse cx="84" cy="61" rx="3" ry="2" fill="#fff" opacity="0.6" />
          </g>
        </g>
      </svg>

      <span className="text-sm text-muted-foreground animate-pulse">
        Thinking...
      </span>
    </div>
  )
}
