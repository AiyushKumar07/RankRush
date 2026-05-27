/**
 * PlanCard — admin pricing plan card matching .pa-card from AdminPricingPlans.html.
 */
import { Edit, MoreVertical, CircleCheck, Pause } from "lucide-react";

export default function PlanCard({
  icon: Icon,
  name,
  description,
  featured = false,
  status = "Live",
  activeSubs,
  activeSubsPct,
  mrrContrib,
  cadences = [],
  tokenAllowance,
  features = [],
  updatedText,
  editVariant = "secondary",
}) {
  return (
    <div className={`pa-card${featured ? " featured" : ""}`}>
      <div className="pa-head">
        <div className="title">
          <h3>
            {Icon && <Icon size={18} style={{ color: featured ? "var(--rr-violet-500)" : "var(--rr-fg-muted)" }} />}
            {name}
          </h3>
          <span className="desc">{description}</span>
        </div>
        <div className="right" style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span className="status-pill published">{status}</span>
          <button className="row-act" title="Edit"><Edit size={14} /></button>
          <button className="row-act" title="More"><MoreVertical size={14} /></button>
        </div>
      </div>
      <div className="pa-meta">
        <div className="item">
          <span className="lbl">Active subs</span>
          <span className="val">{activeSubs} <small>&middot; {activeSubsPct}</small></span>
        </div>
        <div className="item">
          <span className="lbl">MRR contrib.</span>
          <span className="val">{mrrContrib}</span>
        </div>
      </div>
      <div className="pa-body">
        {cadences.map((c, i) => (
          <div className="cadence-section" key={i}>
            {i === 0 && (
              <div className="cs-head">
                <span className="lbl"><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>Pricing variants</span></span>
              </div>
            )}
            <div className={`cadence-row${c.inactive ? " inactive" : ""}`}>
              <div>
                <span className="price">{c.price}</span>
                <span className="price-per">{c.per}</span>
              </div>
              <div className="subs">
                <span className="n">{c.count}</span>
                <small>{c.countLabel}</small>
              </div>
              <div className="actions" style={{ display: "flex", gap: 2 }}>
                <button title="Edit" style={{ width: 24, height: 24, background: "transparent", border: "1px solid transparent", color: "var(--rr-fg-muted)", borderRadius: 4, display: "grid", placeItems: "center", cursor: "pointer" }}>
                  <Edit size={12} />
                </button>
                <button title="Disable" style={{ width: 24, height: 24, background: "transparent", border: "1px solid transparent", color: "var(--rr-fg-muted)", borderRadius: 4, display: "grid", placeItems: "center", cursor: "pointer" }}>
                  <Pause size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
        <div className="feat-section" style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--rr-border)" }}>
          <div className="lbl" style={{ fontFamily: "var(--rr-font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--rr-fg-muted)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{tokenAllowance}</span>
            <button className="row-act" style={{ height: 20, width: 20 }}><Edit size={11} /></button>
          </div>
          <div className="feat-list" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {features.map((f, i) => (
              <span key={i} className="feat" style={{ fontSize: 12, color: "var(--rr-fg-2)", display: "flex", alignItems: "center", gap: 8 }}>
                <CircleCheck size={13} style={{ color: "var(--rr-emerald-500)", flexShrink: 0 }} />
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="pa-foot">
        <span className="meta" style={{ fontFamily: "var(--rr-font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--rr-fg-muted)" }}>
          Updated <b style={{ color: "var(--rr-fg)", fontFamily: "var(--rr-font-display)", fontSize: 14, fontWeight: 700 }}>{updatedText}</b> by Astitva R.
        </span>
        <button className={`btn btn-${editVariant} btn-sm`}><Edit size={12} />Edit plan</button>
      </div>
    </div>
  );
}
