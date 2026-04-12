"use client"

/**
 * Badge-check icon — the tickr brand mark. Terracotta with gentle pulse.
 * Used in: chat heading, sidebar empty state.
 */
export function MascotIcon({ size = 40 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <style>{`
        .mi-badge {
          stroke: #E07C4C;
          animation: mi-pulse 3s ease-in-out infinite;
          transform-origin: 12px 12px;
        }
        .mi-check {
          stroke: #E07C4C;
          animation: mi-draw 2s ease-in-out infinite;
          stroke-dasharray: 12;
          stroke-dashoffset: 0;
        }
        @keyframes mi-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.06); opacity: 0.85; }
        }
        @keyframes mi-draw {
          0%, 40% { stroke-dashoffset: 0; }
          20% { stroke-dashoffset: -12; }
        }
      `}</style>
      <path
        className="mi-badge"
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
      />
      <path className="mi-check" d="m9 12 2 2 4-4" />
    </svg>
  )
}

/**
 * Animated trading mascot character — watches a mini candlestick chart.
 * Used in: loading state, empty sidebar.
 */
export function MascotCharacter({ size = 40 }: { size?: number }) {
  const aspectRatio = 160 / 86
  const width = size * aspectRatio
  const height = size

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 86"
      width={width}
      height={height}
      className="shrink-0"
    >
      <style>{`
        .mc-right-arm {
          animation: mc-arm-point 3s ease-in-out infinite;
          transform-origin: 86px 40px;
        }
        .mc-eye-l {
          animation: mc-blink 4s ease-in-out infinite, mc-watch 3s ease-in-out infinite;
          transform-origin: 42px 39px;
        }
        .mc-eye-r {
          animation: mc-blink 4s ease-in-out infinite, mc-watch 3s ease-in-out infinite;
          transform-origin: 72px 39px;
        }
        .mc-chart-line {
          animation: mc-tick 3s ease-in-out infinite;
        }
        .mc-chart-dot {
          animation: mc-tick-dot 3s ease-in-out infinite;
        }
        .mc-candle-1 { animation: mc-c1 3s ease-in-out infinite; }
        .mc-candle-2 { animation: mc-c2 3s ease-in-out infinite; }
        .mc-candle-3 { animation: mc-c3 3s ease-in-out infinite; }
        .mc-candle-4 { animation: mc-c4 3s ease-in-out infinite; }
        @keyframes mc-arm-point {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        @keyframes mc-blink {
          0%, 42%, 48%, 100% { transform: scaleY(1); }
          45% { transform: scaleY(0.1); }
        }
        @keyframes mc-watch {
          0%, 100% { transform: translateY(0); }
          30% { transform: translateY(-1px); }
          70% { transform: translateY(1px); }
        }
        @keyframes mc-tick {
          0% { d: path("M100,68 L112,62 L124,66 L136,54 L148,58"); }
          25% { d: path("M100,66 L112,58 L124,64 L136,50 L148,52"); }
          50% { d: path("M100,64 L112,60 L124,56 L136,58 L148,48"); }
          75% { d: path("M100,68 L112,64 L124,60 L136,56 L148,54"); }
          100% { d: path("M100,68 L112,62 L124,66 L136,54 L148,58"); }
        }
        @keyframes mc-tick-dot {
          0% { cx: 148; cy: 58; }
          25% { cx: 148; cy: 52; }
          50% { cx: 148; cy: 48; }
          75% { cx: 148; cy: 54; }
          100% { cx: 148; cy: 58; }
        }
        @keyframes mc-c1 {
          0%, 100% { height: 14px; y: 60; }
          50% { height: 18px; y: 56; }
        }
        @keyframes mc-c2 {
          0%, 100% { height: 10px; y: 58; }
          50% { height: 16px; y: 54; }
        }
        @keyframes mc-c3 {
          0%, 100% { height: 18px; y: 54; }
          50% { height: 12px; y: 58; }
        }
        @keyframes mc-c4 {
          0%, 100% { height: 12px; y: 56; }
          50% { height: 20px; y: 50; }
        }
      `}</style>

      {/* Shadow */}
      <ellipse cx="50" cy="84" rx="22" ry="4" fill="#000" opacity="0.2" />

      {/* Character */}
      <g>
        <rect x="22" y="10" width="8" height="14" fill="#E07C4C" />
        <rect x="70" y="10" width="8" height="14" fill="#E07C4C" />
        <rect x="18" y="24" width="64" height="4" fill="#E07C4C" />
        <rect x="14" y="28" width="72" height="32" fill="#E07C4C" />
        <rect className="mc-eye-l" x="38" y="34" width="8" height="10" fill="#000" />
        <rect className="mc-eye-r" x="68" y="34" width="8" height="10" fill="#000" />
        <rect x="2" y="36" width="12" height="8" fill="#E07C4C" />
        <rect className="mc-right-arm" x="86" y="36" width="14" height="8" fill="#E07C4C" />
        <rect x="24" y="60" width="12" height="12" fill="#E07C4C" />
        <rect x="22" y="72" width="16" height="6" rx="1" fill="#1a1a1a" />
        <rect x="64" y="60" width="12" height="12" fill="#E07C4C" />
        <rect x="62" y="72" width="16" height="6" rx="1" fill="#1a1a1a" />
      </g>

      {/* Mini chart */}
      <g>
        <rect x="96" y="42" width="58" height="38" rx="4" fill="#1a1a18" opacity="0.9" />
        <rect x="96" y="42" width="58" height="38" rx="4" stroke="#30302e" strokeWidth="1" fill="none" />
        <line x1="100" y1="52" x2="150" y2="52" stroke="#30302e" strokeWidth="0.5" />
        <line x1="100" y1="62" x2="150" y2="62" stroke="#30302e" strokeWidth="0.5" />
        <line x1="100" y1="72" x2="150" y2="72" stroke="#30302e" strokeWidth="0.5" />
        <rect className="mc-candle-1" x="103" y="60" width="4" height="14" rx="0.5" fill="#22c55e" />
        <rect className="mc-candle-2" x="112" y="58" width="4" height="10" rx="0.5" fill="#ef4444" />
        <rect className="mc-candle-3" x="121" y="54" width="4" height="18" rx="0.5" fill="#22c55e" />
        <rect className="mc-candle-4" x="130" y="56" width="4" height="12" rx="0.5" fill="#22c55e" />
        <path
          className="mc-chart-line"
          d="M100,68 L112,62 L124,66 L136,54 L148,58"
          fill="none"
          stroke="#E07C4C"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle className="mc-chart-dot" cx="148" cy="58" r="2.5" fill="#E07C4C" />
      </g>
    </svg>
  )
}
