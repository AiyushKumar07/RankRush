/**
 * EmptyState — placeholder for empty tables/lists.
 * Matches .empty from admin-shell.css.
 */
export default function EmptyState({ icon: Icon, title, description, children }) {
  return (
    <div
      style={{
        background: "var(--rr-surface)",
        border: "1px dashed var(--rr-border-strong)",
        borderRadius: "var(--rr-r-md)",
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      {Icon && (
        <div
          style={{
            width: 56, height: 56,
            background: "var(--rr-bg-alt)",
            borderRadius: "var(--rr-r-md)",
            display: "grid", placeItems: "center",
            margin: "0 auto 14px",
            color: "var(--rr-fg-muted)",
          }}
        >
          <Icon size={24} />
        </div>
      )}
      {title && (
        <h4
          style={{
            fontFamily: "var(--rr-font-display)",
            margin: "0 0 4px",
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h4>
      )}
      {description && (
        <p style={{ fontSize: 13, color: "var(--rr-fg-muted)", margin: "0 0 16px" }}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
