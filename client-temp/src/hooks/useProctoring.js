/**
 * useProctoring — thin React layer over ProctoringEngine.
 *
 * Returns:
 *   {
 *     status: 'idle' | 'active' | 'disqualified',
 *     warning: { type, message, at } | null,   // most recent transient banner
 *     strikes: number,
 *     limit: number,
 *     violations: [...],                       // full audit trail
 *     attachVideo(el),                         // call from <video ref>
 *     attachStream(stream),                    // call once getUserMedia resolves
 *     start(), stop(),
 *   }
 *
 * The hook owns ONE engine for the lifetime of the consumer component.
 * Re-mounting (StrictMode dev) safely re-uses the same instance because
 * the engine internally guards start()/stop() with a _running flag.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ProctoringEngine } from '../lib/proctoring/ProctoringEngine.js';
import { DISQUALIFY_AT, VIOLATION_RULES } from '../lib/proctoring/rules.js';

export default function useProctoring({ enabled = true, onDisqualify } = {}) {
  const onDisqualifyRef = useRef(onDisqualify);
  useEffect(() => { onDisqualifyRef.current = onDisqualify; }, [onDisqualify]);

  const [status, setStatus] = useState('idle');
  const [strikes, setStrikes] = useState(0);
  const [warning, setWarning] = useState(null);
  const [violations, setViolations] = useState([]);

  const engine = useMemo(
    () => new ProctoringEngine({
      onEvent: (e) => {
        // Surface every observed event as a toast — but only one toast
        // per (type) at a time, so a flapping monitor doesn't drown the UI.
        const tone = e.severity === 'strike' ? 'error' : 'warn';
        const icon = e.severity === 'strike' ? '⛔' : '⚠️';
        toast(
          `${e.severity === 'strike' ? 'Strike' : 'Warning'}: ${e.message}`,
          { id: `proctor-${e.type}`, icon, duration: 5000, style: { maxWidth: 420 } },
        );
        setWarning({ type: e.type, message: e.message, severity: e.severity, at: Date.now() });
        // Persist the audit trail so a parent can ship it on submit.
        setViolations((prev) => [...prev, e]);
        // Tone is unused for now; kept for future routing.
        void tone;
      },
      onStrike: ({ totalStrikes }) => {
        setStrikes(totalStrikes);
      },
      onDisqualify: ({ reason, violations }) => {
        setStatus('disqualified');
        if (onDisqualifyRef.current) {
          try {
            onDisqualifyRef.current({ reason, violations });
          } catch (err) {
            console.error('[proctoring] onDisqualify handler threw', err);
          }
        }
      },
    }),
    // The engine is intentionally created once; deps left empty so we
    // don't tear down + recreate it on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Auto-stop on unmount so refs/timers don't leak.
  useEffect(() => () => engine.stop(), [engine]);

  const attachVideo = useCallback((el) => engine.attachVideo(el), [engine]);
  const attachStream = useCallback((s) => engine.attachStream(s), [engine]);

  const start = useCallback(async () => {
    if (!enabled) return;
    await engine.start();
    setStatus('active');
  }, [engine, enabled]);

  const stop = useCallback(() => {
    engine.stop();
    setStatus('idle');
  }, [engine]);

  return {
    status,
    warning,
    strikes,
    limit: DISQUALIFY_AT,
    violations,
    attachVideo,
    attachStream,
    start,
    stop,
    rules: VIOLATION_RULES,
  };
}
