/**
 * ProctoringHud — persistent banner in the quiz topbar/footer area that
 * shows the current strike count + most-recent warning text.
 *
 * Visual states:
 *   - clean (0 strikes, no warning): hidden
 *   - warning (transient): amber pill with the message
 *   - struck (strikes > 0): coral pill with "X / N strikes" and the cause
 */
import { ShieldAlert, AlertTriangle } from "lucide-react";
import "./ProctoringHud.css";

export default function ProctoringHud({ strikes, limit, warning, status }) {
  if (status === "idle") return null;
  const struck = strikes > 0;
  const showWarning = warning && Date.now() - warning.at < 5000;
  if (!struck && !showWarning) return null;

  return (
    <div
      className={`proctor-hud ${struck ? "struck" : "warn"}`}
      role="status"
      aria-live="polite"
    >
      {struck ? <ShieldAlert size={14} /> : <AlertTriangle size={14} />}
      <span className="proctor-hud-count">
        {struck ? `${strikes} / ${limit} strikes` : "Proctoring warning"}
      </span>
      {warning?.message && <span className="proctor-hud-msg">· {warning.message}</span>}
    </div>
  );
}
