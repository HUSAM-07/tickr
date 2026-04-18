/** Inline SVG illustrations for the Wiki page.
 *
 * Each illustration is a self-contained SVG with CSS animations driven by
 * <style> tags inside the SVG — no JS, no external deps. They tell the
 * story of each product at a glance. */

export function GridRushIllustration() {
  return (
    <svg
      viewBox="0 0 320 200"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      role="img"
      aria-label="GridRush — a price line threading through a grid of cells"
    >
      <defs>
        <linearGradient id="gr-line" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#788c5d" stopOpacity="0.2" />
          <stop offset="0.5" stopColor="#788c5d" stopOpacity="0.9" />
          <stop offset="1" stopColor="#a0b67f" />
        </linearGradient>
        <filter id="gr-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      {/* Grid of cells (5 cols × 4 rows) */}
      <g stroke="var(--color-border)" strokeWidth="0.5" fill="none">
        {Array.from({ length: 5 }).map((_, c) =>
          Array.from({ length: 4 }).map((_, r) => (
            <rect
              key={`${c}-${r}`}
              x={20 + c * 56}
              y={20 + r * 40}
              width={56}
              height={40}
              rx={4}
            />
          ))
        )}
      </g>

      {/* Heat-mapped target cell (winning cell) */}
      <rect
        x={132}
        y={60}
        width={56}
        height={40}
        rx={4}
        fill="#788c5d"
        fillOpacity="0.18"
        stroke="#a0b67f"
        strokeWidth="1.5"
        className="gr-target-cell"
      />

      {/* Dashed NOW line */}
      <line
        x1={160}
        y1={12}
        x2={160}
        y2={188}
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="1"
        strokeDasharray="3 3"
      />

      {/* Price line — stroke-dashoffset animates to draw it */}
      <path
        d="M 20 140 C 60 110, 90 160, 120 120 S 170 60, 200 80 S 250 130, 300 70"
        fill="none"
        stroke="url(#gr-line)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="320"
        strokeDashoffset="320"
        className="gr-line"
      />

      {/* Price tip — travels along the path */}
      <circle r="3.5" fill="#a0b67f" className="gr-tip">
        <animateMotion
          dur="6s"
          repeatCount="indefinite"
          path="M 20 140 C 60 110, 90 160, 120 120 S 170 60, 200 80 S 250 130, 300 70"
        />
      </circle>

      {/* Gold stake chip on the target cell */}
      <g className="gr-chip">
        <circle cx={144} cy={92} r="6" fill="#e5c04a" stroke="#1a1a18" strokeWidth="0.5" />
        <text
          x={144}
          y={94}
          fontSize="6"
          fontWeight="700"
          fontFamily="Styrene A, system-ui, sans-serif"
          fill="#1a1a18"
          textAnchor="middle"
        >
          1
        </text>
      </g>

      <style>{`
        .gr-line { animation: grDraw 6s ease-in-out infinite; }
        @keyframes grDraw {
          0%   { stroke-dashoffset: 320; }
          50%  { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; }
        }
        .gr-target-cell {
          animation: grPulse 6s ease-in-out infinite;
          transform-origin: 160px 80px;
        }
        @keyframes grPulse {
          0%,  50% { stroke-opacity: 0.4; fill-opacity: 0.1; }
          70%      { stroke-opacity: 1;   fill-opacity: 0.5; }
          100%     { stroke-opacity: 0.4; fill-opacity: 0.1; }
        }
        .gr-chip {
          transform-origin: 144px 92px;
          animation: grChipPop 6s ease-out infinite;
        }
        @keyframes grChipPop {
          0%, 8%  { transform: translateY(-20px) scale(0); opacity: 0; }
          15%     { transform: translateY(0) scale(1.2); opacity: 1; }
          25%     { transform: translateY(0) scale(1); opacity: 1; }
          100%    { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </svg>
  )
}

export function SpikeHunterIllustration() {
  return (
    <svg
      viewBox="0 0 320 200"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      role="img"
      aria-label="Spike Hunter — a flat sparkline suddenly spiking upward"
    >
      <defs>
        <linearGradient id="sh-line" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#b0aea5" stopOpacity="0.4" />
          <stop offset="1" stopColor="#d97757" />
        </linearGradient>
      </defs>

      {/* Pressure gauge — partial ring on the right */}
      <g transform="translate(250 100)">
        <circle
          r={44}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.08"
          strokeWidth="8"
        />
        <circle
          r={44}
          fill="none"
          stroke="#d97757"
          strokeWidth="8"
          strokeDasharray="276"
          strokeDashoffset="276"
          strokeLinecap="round"
          transform="rotate(-90)"
          className="sh-gauge"
        />
        <text
          y="-4"
          textAnchor="middle"
          fontSize="7"
          fontFamily="Styrene A, system-ui, sans-serif"
          fill="currentColor"
          fillOpacity="0.55"
        >
          TICKS SINCE
        </text>
        <text
          y="14"
          textAnchor="middle"
          fontSize="20"
          fontWeight="500"
          fontFamily="Tiempos Headline, ui-serif, serif"
          fill="currentColor"
          className="sh-counter"
        >
          483
        </text>
      </g>

      {/* Sparkline area (left ~half of viewport) */}
      <g>
        {/* Flat-ish price path that suddenly shoots up */}
        <path
          d="M 10 130 L 30 132 L 50 128 L 70 131 L 90 127 L 110 133 L 130 129 L 150 126 L 170 130 L 175 128 L 180 40"
          fill="none"
          stroke="url(#sh-line)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="320"
          strokeDashoffset="320"
          className="sh-line"
        />

        {/* Spike marker — circle at the peak */}
        <circle cx={180} cy={40} r="4" fill="#d97757" className="sh-spike">
          <animate
            attributeName="r"
            values="0;0;0;0;4;10;0"
            keyTimes="0;0.6;0.7;0.78;0.82;0.92;1"
            dur="5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="fill-opacity"
            values="0;0;0;0;1;0;0"
            keyTimes="0;0.6;0.7;0.78;0.82;0.92;1"
            dur="5s"
            repeatCount="indefinite"
          />
        </circle>
      </g>

      <style>{`
        .sh-line { animation: shDraw 5s ease-out infinite; }
        @keyframes shDraw {
          0%   { stroke-dashoffset: 320; }
          82%  { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; }
        }
        .sh-gauge { animation: shGauge 5s ease-out infinite; }
        @keyframes shGauge {
          0%   { stroke-dashoffset: 276; }
          80%  { stroke-dashoffset: 20; }
          82%  { stroke-dashoffset: 276; }
          100% { stroke-dashoffset: 276; }
        }
        .sh-counter { animation: shCounter 5s linear infinite; }
        @keyframes shCounter {
          0%, 100% { opacity: 1; }
          82% { opacity: 0; }
          85% { opacity: 1; }
        }
      `}</style>
    </svg>
  )
}

export function ParlayIllustration() {
  return (
    <svg
      viewBox="0 0 320 200"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      role="img"
      aria-label="Parlay — three grid cells linked by a dashed connector, all glowing in sync"
    >
      {/* Three grid cells spread horizontally */}
      <g>
        {[
          { cx: 60, cy: 120 },
          { cx: 160, cy: 70 },
          { cx: 260, cy: 110 },
        ].map((p, i) => (
          <g key={i}>
            <rect
              x={p.cx - 30}
              y={p.cy - 22}
              width={60}
              height={44}
              rx={5}
              fill="#d97757"
              fillOpacity="0.05"
              stroke="#d97757"
              strokeWidth="1.5"
              className={`p-leg p-leg-${i}`}
            />
            <text
              x={p.cx}
              y={p.cy + 3}
              fontSize="11"
              fontWeight="600"
              fontFamily="Styrene A, system-ui, sans-serif"
              fill="#d97757"
              textAnchor="middle"
            >
              {["3.2x", "2.8x", "4.1x"][i]}
            </text>
            {/* Diamond link-mark (top-right corner) */}
            <path
              d={`M ${p.cx + 22} ${p.cy - 16} l 3 3 l -3 3 l -3 -3 z`}
              fill="#d97757"
            />
          </g>
        ))}
      </g>

      {/* Dashed connectors between the legs */}
      <path
        d="M 88 112 Q 120 90, 132 75"
        fill="none"
        stroke="#d97757"
        strokeOpacity="0.6"
        strokeWidth="1.2"
        strokeDasharray="3 3"
        className="p-link"
      />
      <path
        d="M 188 78 Q 220 96, 232 106"
        fill="none"
        stroke="#d97757"
        strokeOpacity="0.6"
        strokeWidth="1.2"
        strokeDasharray="3 3"
        className="p-link"
      />

      {/* Combined multiplier badge */}
      <g transform="translate(160 170)">
        <rect
          x={-46}
          y={-12}
          width={92}
          height={24}
          rx={12}
          fill="var(--color-accent)"
          fillOpacity="0.12"
          stroke="#d97757"
          strokeWidth="1"
        />
        <text
          textAnchor="middle"
          y="4"
          fontSize="12"
          fontWeight="600"
          fontFamily="Styrene A, system-ui, sans-serif"
          fill="#d97757"
        >
          = 37.5x combined
        </text>
      </g>

      <style>{`
        .p-leg { animation: pLegPulse 3s ease-in-out infinite; transform-origin: center; }
        .p-leg-0 { animation-delay: 0s; }
        .p-leg-1 { animation-delay: 0.3s; }
        .p-leg-2 { animation-delay: 0.6s; }
        @keyframes pLegPulse {
          0%, 100% { stroke-opacity: 0.6; fill-opacity: 0.05; }
          50%      { stroke-opacity: 1;   fill-opacity: 0.20; }
        }
        .p-link { animation: pLinkFlow 2s linear infinite; }
        @keyframes pLinkFlow {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -12; }
        }
      `}</style>
    </svg>
  )
}

export function ChatIllustration() {
  return (
    <svg
      viewBox="0 0 320 200"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      role="img"
      aria-label="Chat — a user prompt followed by a streamed assistant reply with an inline chart"
    >
      {/* User bubble */}
      <g className="c-user">
        <rect
          x={100}
          y={18}
          width={200}
          height={34}
          rx={14}
          fill="var(--color-secondary)"
        />
        <text
          x={112}
          y={40}
          fontSize="11"
          fontFamily="Styrene A, system-ui, sans-serif"
          fill="currentColor"
        >
          Chart V75 with SMA overlay
        </text>
      </g>

      {/* Assistant label */}
      <text
        x={20}
        y={72}
        fontSize="9"
        fontWeight="500"
        fontFamily="Styrene A, system-ui, sans-serif"
        fill="currentColor"
        fillOpacity="0.55"
        className="c-label"
      >
        tickr
      </text>

      {/* Streaming text blocks */}
      <g className="c-lines">
        <rect x={20} y={80} width={160} height={7} rx={3} fill="currentColor" fillOpacity="0.15" className="c-line c-line-1" />
        <rect x={20} y={92} width={210} height={7} rx={3} fill="currentColor" fillOpacity="0.15" className="c-line c-line-2" />
        <rect x={20} y={104} width={130} height={7} rx={3} fill="currentColor" fillOpacity="0.15" className="c-line c-line-3" />
      </g>

      {/* Inline chart widget (mini candlestick) */}
      <g transform="translate(20 120)" className="c-widget">
        <rect width={280} height={64} rx={8} fill="var(--color-card)" stroke="var(--color-border)" strokeWidth="1" />
        {/* Candles */}
        {[
          { x: 14, y: 34, h: 22, bull: true },
          { x: 34, y: 20, h: 34, bull: true },
          { x: 54, y: 28, h: 26, bull: false },
          { x: 74, y: 14, h: 40, bull: true },
          { x: 94, y: 22, h: 32, bull: false },
          { x: 114, y: 10, h: 44, bull: true },
          { x: 134, y: 18, h: 30, bull: true },
          { x: 154, y: 30, h: 22, bull: false },
          { x: 174, y: 16, h: 38, bull: true },
          { x: 194, y: 8, h: 46, bull: true },
          { x: 214, y: 14, h: 38, bull: true },
          { x: 234, y: 22, h: 26, bull: false },
          { x: 254, y: 12, h: 40, bull: true },
        ].map((c, i) => (
          <rect
            key={i}
            x={c.x}
            y={c.y}
            width={8}
            height={c.h}
            fill={c.bull ? "#788c5d" : "#d97757"}
          />
        ))}
        {/* SMA overlay */}
        <path
          d="M 14 40 Q 40 30 70 28 T 130 24 T 200 18 T 270 22"
          fill="none"
          stroke="#6a9bcc"
          strokeWidth="1.5"
        />
      </g>

      <style>{`
        .c-user { animation: cBubble 5s ease-out infinite; transform-origin: 200px 35px; }
        @keyframes cBubble {
          0%, 10%  { opacity: 0; transform: translateY(-6px); }
          20%      { opacity: 1; transform: translateY(0); }
          100%     { opacity: 1; transform: translateY(0); }
        }
        .c-label { opacity: 0; animation: cFade 5s ease-out infinite; animation-delay: 0.6s; }
        .c-line  { opacity: 0; animation: cFade 5s ease-out infinite; }
        .c-line-1 { animation-delay: 0.8s; }
        .c-line-2 { animation-delay: 1.1s; }
        .c-line-3 { animation-delay: 1.4s; }
        @keyframes cFade {
          0%, 12%  { opacity: 0; transform: translateX(-4px); }
          24%      { opacity: 1; transform: translateX(0); }
          100%     { opacity: 1; transform: translateX(0); }
        }
        .c-widget { opacity: 0; transform-origin: 160px 32px; animation: cWidget 5s ease-out infinite; animation-delay: 1.8s; }
        @keyframes cWidget {
          0%, 34%  { opacity: 0; transform: translateY(8px) scale(0.98); }
          44%      { opacity: 1; transform: translateY(0) scale(1); }
          100%     { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </svg>
  )
}

export function TickFeedIllustration() {
  return (
    <svg
      viewBox="0 0 320 200"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      role="img"
      aria-label="Deriv tick feed — WebSocket pulses radiating outward"
    >
      <text
        x={160}
        y={185}
        textAnchor="middle"
        fontSize="9"
        fontWeight="500"
        fontFamily="Styrene A, system-ui, sans-serif"
        fill="currentColor"
        fillOpacity="0.55"
        letterSpacing="0.05em"
      >
        DERIV WEBSOCKET · LIVE
      </text>

      {/* Concentric radar pulses */}
      <g transform="translate(160 90)">
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            r={10}
            fill="none"
            stroke="#c96442"
            strokeWidth="1"
            className={`tf-pulse tf-pulse-${i}`}
          />
        ))}

        {/* Center dot */}
        <circle r={6} fill="#c96442" />
        <circle r={10} fill="none" stroke="#c96442" strokeOpacity="0.5" strokeWidth="1.5" />
      </g>

      {/* Satellite symbol tags orbiting */}
      {[
        { t: "R_100", x: 40,  y: 50 },
        { t: "BOOM",  x: 260, y: 56 },
        { t: "BTC",   x: 50,  y: 130 },
        { t: "GOLD",  x: 270, y: 130 },
      ].map((s) => (
        <g key={s.t} transform={`translate(${s.x} ${s.y})`}>
          <rect
            x={-18}
            y={-10}
            width={36}
            height={20}
            rx={10}
            fill="var(--color-card)"
            stroke="var(--color-border)"
            strokeWidth="1"
          />
          <text
            textAnchor="middle"
            y="4"
            fontSize="9"
            fontWeight="600"
            fontFamily="Styrene A, system-ui, sans-serif"
            fill="currentColor"
          >
            {s.t}
          </text>
        </g>
      ))}

      <style>{`
        .tf-pulse {
          animation: tfPulse 2.4s ease-out infinite;
          transform-origin: 0 0;
        }
        .tf-pulse-0 { animation-delay: 0s;   }
        .tf-pulse-1 { animation-delay: 0.8s; }
        .tf-pulse-2 { animation-delay: 1.6s; }
        @keyframes tfPulse {
          0%   { transform: scale(1);   stroke-opacity: 0.9; }
          100% { transform: scale(8);   stroke-opacity: 0;   }
        }
      `}</style>
    </svg>
  )
}
