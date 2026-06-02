/**
 * RankRush — Brand mark
 * Used in sidebar, navs, auth screens. Inherits sizing from .rr-mark variants.
 *
 * Usage:
 *   <RRBrand />            // 30px mark + "RankRush" wordmark
 *   <RRBrand size="sm" />  // 22px mark
 *   <RRBrand markOnly />   // just the chevron square
 */
import { Link } from "react-router-dom";

export default function RRBrand({
  size = "md", // "sm" | "md" | "lg"
  markOnly = false,
  to = "/",
  className = "",
}) {
  return (
    <Link
      to={to}
      className={`rr-brand ${className}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        className={`rr-mark ${size === "sm" ? "sm" : size === "lg" ? "lg" : ""}`}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 14L12 7L19 14"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 19L12 12L19 19"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.55"
          />
        </svg>
      </div>
      {!markOnly && (
        <span className="rr-name">
          Rank<b>Rush</b>
        </span>
      )}
    </Link>
  );
}
