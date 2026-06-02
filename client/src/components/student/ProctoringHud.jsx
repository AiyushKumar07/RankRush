/**
 * ProctoringHud — transient banner in the quiz topbar that surfaces the
 * most recent proctoring event (warning OR strike) and then auto-hides.
 *
 * Why transient and not persistent: a sticky "you have N strikes" pill
 * pulses in the candidate's peripheral vision the entire attempt — it
 * reads as accusatory and adds anxiety without changing behavior. The
 * auto-submit modal explains the consequence at the moment it matters.
 *
 * Visual states:
 *   - clean (no recent event): hidden
 *   - warning (transient): amber pill, ~6s
 *   - strike (transient): coral pill with "X / N strikes" + cause, ~6s
 */
import { useEffect, useState } from "react";
import { ShieldAlert, AlertTriangle } from "lucide-react";
import "./ProctoringHud.css";

const DISMISS_MS = 6000;

export default function ProctoringHud({ strikes, limit, warning, status }) {
  // Force a re-render when the dismissal threshold passes so the pill
  // disappears. `warning.at` is the timestamp on the latest event; we
  // re-evaluate visibility each time it (or our tick) changes.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!warning) return undefined;
    const t = setTimeout(() => setTick((n) => n + 1), DISMISS_MS + 50);
    return () => clearTimeout(t);
  }, [warning]);

  if (status === "idle") return null;
  if (!warning) return null;
  const age = Date.now() - warning.at;
  if (age >= DISMISS_MS) return null;

  const isStrike = warning.severity === "strike";
  return (
    <div
      className={`proctor-hud ${isStrike ? "struck" : "warn"}`}
      role="status"
      aria-live="polite"
    >
      {isStrike ? <ShieldAlert size={14} /> : <AlertTriangle size={14} />}
      <span className="proctor-hud-count">
        {isStrike
          ? `${strikes} / ${limit} strikes — auto-submit at ${limit}`
          : "Proctoring warning"}
      </span>
      {warning.message && <span className="proctor-hud-msg">· {warning.message}</span>}
    </div>
  );
}
