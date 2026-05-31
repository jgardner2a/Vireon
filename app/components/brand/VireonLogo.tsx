import Link from "next/link";
import { ROUTE_HOME } from "@/lib/appNavigation";
import "./vireon-logo.css";

type VireonLogoProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
};

function LogoMark({ size }: { size: "sm" | "md" | "lg" }) {
  return (
    <svg
      className={`vireon-logo__mark vireon-logo__mark--${size}`}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        width="40"
        height="40"
        rx="10"
        fill="url(#vireon-logo-gradient)"
      />
      {/* Roofline + document stack suggestion */}
      <path
        d="M8 14 L20 8 L32 14"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 26 L20 18 L27 26"
        stroke="#ffffff"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 18 V30"
        stroke="#ffffff"
        strokeWidth="2.75"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient
          id="vireon-logo-gradient"
          x1="4"
          y1="4"
          x2="36"
          y2="36"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#185c47" />
          <stop offset="1" stopColor="#2f966f" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function VireonLogo({
  href = ROUTE_HOME,
  size = "md",
  showWordmark = true,
  className = "",
}: VireonLogoProps) {
  const content = (
    <>
      <LogoMark size={size} />
      {showWordmark ? (
        <span className={`vireon-logo__wordmark vireon-logo__wordmark--${size}`}>
          Vireon
        </span>
      ) : null}
    </>
  );

  const classes = ["vireon-logo", `vireon-logo--${size}`, className]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={classes} aria-label="Vireon home">
        {content}
      </Link>
    );
  }

  return <span className={classes}>{content}</span>;
}
