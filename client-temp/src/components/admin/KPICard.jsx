/**
 * KPICard — key performance indicator card for admin dashboard.
 * Matches .kpi from AdminDashboard.html.
 */
import { ArrowUp, ArrowDown } from "lucide-react";

export default function KPICard({
  icon: Icon,
  label,
  value,
  valueSuffix,
  delta,
  deltaType = "up",
  hint,
  sparkColor = "var(--rr-emerald-500)",
  sparkPath,
}) {
  return (
    <div className="kpi">
      <div className="kpi-top">
        <span className="kpi-lbl">
          {Icon && <Icon size={12} />}
          {label}
        </span>
        {delta && (
          <span className={`kpi-delta ${deltaType}`}>
            {deltaType === "down" ? <ArrowDown size={11} /> : deltaType === "up" ? <ArrowUp size={11} /> : null}
            {delta}
          </span>
        )}
      </div>
      <div className="kpi-v">
        {value}
        {valueSuffix && <small>{valueSuffix}</small>}
      </div>
      {hint && <div className="kpi-hint">{hint}</div>}
      {sparkPath && (
        <svg className="kpi-spark" viewBox="0 0 80 28">
          <path d={sparkPath} stroke={sparkColor} fill="none" strokeWidth="1.5" />
        </svg>
      )}
    </div>
  );
}
