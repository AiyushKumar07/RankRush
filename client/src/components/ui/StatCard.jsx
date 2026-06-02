import { ArrowUp, ArrowDown } from "lucide-react";

const COLOR_MAP = {
  amber: "var(--rr-amber-500)",
  emerald: "var(--rr-emerald-500)",
  violet: "var(--rr-violet-500)",
  cyan: "var(--rr-cyan-600)",
};

export default function StatCard({ label, icon: Icon, value, unit, delta, deltaType, hint, color }) {
  const valueColor = COLOR_MAP[color] || "var(--rr-fg)";

  const deltaColor =
    deltaType === "down"
      ? "var(--rr-coral-500)"
      : deltaType === "warn"
        ? "var(--rr-amber-500)"
        : "var(--rr-emerald-500)";

  const DeltaIcon = deltaType === "down" ? ArrowDown : ArrowUp;

  return (
    <div className={`stat ${color || ""}`}>
      <div className="top">
        <span className="label">
          {Icon && <Icon size={12} />}
          {label}
        </span>
        {delta && (
          <span className={`delta ${deltaType === "down" ? "down" : deltaType === "warn" ? "warn" : ""}`}>
            {deltaType !== "warn" && <DeltaIcon size={11} />}
            {delta}
          </span>
        )}
      </div>
      <div className="value" style={{ color: valueColor }}>
        {value}
        {unit && <small>{unit}</small>}
      </div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
