/**
 * Badge — pill-shaped status/category badge.
 * Variants: violet, lime, cyan, amber (warn), coral (danger), emerald (success), neutral.
 */
const VARIANTS = {
  violet:  { bg: "color-mix(in oklab, var(--rr-violet-500) 14%, transparent)", color: "var(--rr-violet-700)" },
  lime:    { bg: "var(--rr-lime-400)", color: "#0E0E13" },
  cyan:    { bg: "color-mix(in oklab, var(--rr-cyan-500) 16%, transparent)", color: "var(--rr-cyan-600)" },
  warn:    { bg: "color-mix(in oklab, var(--rr-amber-500) 16%, transparent)", color: "var(--rr-amber-500)" },
  danger:  { bg: "color-mix(in oklab, var(--rr-coral-500) 14%, transparent)", color: "var(--rr-coral-500)" },
  success: { bg: "color-mix(in oklab, var(--rr-emerald-500) 14%, transparent)", color: "var(--rr-emerald-500)" },
  neutral: { bg: "var(--rr-bg-alt)", color: "var(--rr-fg-muted)" },
};

export default function Badge({ variant = "neutral", children, dot = false, style, className = "" }) {
  const v = VARIANTS[variant] || VARIANTS.neutral;
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 26,
        padding: "0 12px",
        borderRadius: "var(--rr-r-full)",
        fontFamily: "var(--rr-font-sans)",
        fontSize: 13,
        fontWeight: 500,
        whiteSpace: "nowrap",
        background: v.bg,
        color: v.color,
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6, height: 6,
            borderRadius: "50%",
            background: "currentColor",
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}

export function ComingSoonChip({ style, className = "" }) {
  return (
    <span
      className={`coming-soon-chip ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 24,
        padding: "0 10px",
        borderRadius: "var(--rr-r-full)",
        fontFamily: "var(--rr-font-sans)",
        fontSize: 11,
        fontWeight: 500,
        background: "var(--rr-bg-alt)",
        color: "var(--rr-fg-muted)",
        border: "1px dashed var(--rr-border-strong)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      Coming Soon
    </span>
  );
}
