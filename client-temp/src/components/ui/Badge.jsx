/**
 * Badge — pill-shaped status/category badge.
 * Variants: violet, lime, cyan, amber (warn), coral (danger), emerald (success), neutral.
 */
const VARIANTS = {
  violet:  { bg: "color-mix(in oklab, var(--rr-violet-500) 14%, transparent)", color: "var(--rr-violet-700)" },
  lime:    { bg: "var(--rr-lime-400)", color: "var(--rr-ink-900)" },
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
        height: 22,
        padding: "0 10px",
        borderRadius: "var(--rr-r-full)",
        fontFamily: "var(--rr-font-mono)",
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
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
