/**
 * Card — generic admin card wrapper matching .acard from admin-shell.css.
 */
export default function Card({ children, className = "", style }) {
  return (
    <div
      className={`acard ${className}`}
      style={{
        background: "var(--rr-surface)",
        border: "1px solid var(--rr-border)",
        borderRadius: "var(--rr-r-lg)",
        boxShadow: "var(--rr-shadow-xs)",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardHead({ children, style }) {
  return (
    <div
      style={{
        padding: "18px 22px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 12,
        borderBottom: "1px solid var(--rr-border)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardBody({ children, style }) {
  return (
    <div style={{ padding: 22, ...style }}>
      {children}
    </div>
  );
}

function CardFoot({ children, style }) {
  return (
    <div
      style={{
        padding: "14px 22px",
        borderTop: "1px solid var(--rr-border)",
        background: "var(--rr-bg-alt)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 12,
        color: "var(--rr-fg-muted)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

Card.Head = CardHead;
Card.Body = CardBody;
Card.Foot = CardFoot;
