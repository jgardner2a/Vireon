import "./home-hero-graphic.css";

type HomeHeroGraphicProps = {
  className?: string;
};

/** Decorative homepage illustration — home + timeline records */
export function HomeHeroGraphic({ className = "" }: HomeHeroGraphicProps) {
  return (
    <div
      className={["vireon-hero-graphic", className].filter(Boolean).join(" ")}
      aria-hidden
    >
      <svg
        className="vireon-hero-graphic__svg"
        viewBox="0 0 420 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Soft background blob */}
        <ellipse
          cx="210"
          cy="190"
          rx="175"
          ry="140"
          fill="var(--vireon-sage-muted)"
          opacity="0.65"
        />

        {/* Timeline spine */}
        <line
          x1="72"
          y1="48"
          x2="72"
          y2="300"
          stroke="var(--vireon-border)"
          strokeWidth="2"
          strokeDasharray="4 6"
        />

        {/* Record cards on timeline */}
        <g className="vireon-hero-graphic__card vireon-hero-graphic__card--1">
          <rect
            x="88"
            y="56"
            width="140"
            height="52"
            rx="10"
            fill="var(--vireon-surface-elevated)"
            stroke="var(--vireon-border)"
          />
          <rect
            x="100"
            y="68"
            width="72"
            height="6"
            rx="3"
            fill="var(--vireon-sage-muted)"
          />
          <rect
            x="100"
            y="82"
            width="96"
            height="5"
            rx="2.5"
            fill="var(--vireon-border-subtle)"
          />
          <circle cx="72" cy="82" r="6" fill="var(--vireon-sage)" />
        </g>

        <g className="vireon-hero-graphic__card vireon-hero-graphic__card--2">
          <rect
            x="88"
            y="128"
            width="160"
            height="58"
            rx="10"
            fill="var(--vireon-surface-elevated)"
            stroke="var(--vireon-border)"
          />
          <rect
            x="100"
            y="140"
            width="56"
            height="28"
            rx="6"
            fill="var(--vireon-sage-subtle)"
            stroke="var(--vireon-border-subtle)"
          />
          <rect
            x="164"
            y="142"
            width="68"
            height="6"
            rx="3"
            fill="var(--vireon-sage-muted)"
          />
          <rect
            x="164"
            y="156"
            width="52"
            height="5"
            rx="2.5"
            fill="var(--vireon-border-subtle)"
          />
          <circle cx="72" cy="157" r="6" fill="var(--vireon-leaf)" />
        </g>

        <g className="vireon-hero-graphic__card vireon-hero-graphic__card--3">
          <rect
            x="88"
            y="206"
            width="128"
            height="48"
            rx="10"
            fill="var(--vireon-surface-elevated)"
            stroke="var(--vireon-border)"
          />
          <rect
            x="100"
            y="218"
            width="80"
            height="6"
            rx="3"
            fill="var(--vireon-sage-muted)"
          />
          <rect
            x="100"
            y="232"
            width="64"
            height="5"
            rx="2.5"
            fill="var(--vireon-border-subtle)"
          />
          <circle cx="72" cy="230" r="6" fill="var(--vireon-sage)" />
        </g>

        {/* House silhouette */}
        <g className="vireon-hero-graphic__house">
          <path
            d="M268 118 L330 158 V280 H206 V158 Z"
            fill="var(--vireon-forest)"
            opacity="0.92"
          />
          <path
            d="M248 158 L268 118 L330 158 L350 158 L268 88 Z"
            fill="var(--vireon-forest-mid)"
          />
          <rect
            x="278"
            y="200"
            width="36"
            height="48"
            rx="4"
            fill="var(--vireon-sage-muted)"
            opacity="0.9"
          />
          <rect
            x="292"
            y="168"
            width="24"
            height="20"
            rx="3"
            fill="rgba(255,255,255,0.25)"
          />
          {/* Export package badge */}
          <rect
            x="300"
            y="248"
            width="88"
            height="36"
            rx="8"
            fill="var(--vireon-surface-elevated)"
            stroke="var(--vireon-leaf)"
            strokeWidth="1.5"
          />
          <path
            d="M316 262 H332 M316 268 H328"
            stroke="var(--vireon-leaf)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <text
            x="338"
            y="270"
            fill="var(--vireon-ink-muted)"
            fontSize="11"
            fontFamily="system-ui, sans-serif"
            fontWeight="600"
          >
            Export
          </text>
        </g>
      </svg>
    </div>
  );
}
