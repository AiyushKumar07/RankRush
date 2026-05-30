/**
 * useProctoring — thin React layer over ProctoringEngine.
 *
 * Returns:
 *   {
 *     status: 'idle' | 'active' | 'submitting',
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
import { EvidenceCollector } from '../lib/proctoring/EvidenceCollector.js';
import { DISQUALIFY_AT, VIOLATION_RULES } from '../lib/proctoring/rules.js';
import { studentAPI } from '../services/api.js';

export default function useProctoring({ enabled = true, quizId, onForceSubmit } = {}) {
  const onForceSubmitRef = useRef(onForceSubmit);
  useEffect(() => { onForceSubmitRef.current = onForceSubmit; }, [onForceSubmit]);

  // Evidence collector lives alongside the engine and follows the same
  // lifecycle. It's null until we have a quizId — the hook is safe to
  // mount before the quiz has loaded.
  const evidenceRef = useRef(null);
  // Toast guard: we only surface ONE evidence-upload error per attempt
  // (otherwise a network blip floods the UI), but every failure still
  // logs to the console with full detail.
  const errorToastShownRef = useRef(false);
  useEffect(() => {
    if (!quizId) return undefined;
    errorToastShownRef.current = false;
    const collector = new EvidenceCollector({
      quizId,
      uploadFn: (formData) => studentAPI.uploadEvidence(quizId, formData),
      onError: (err) => {
        // Log every failure with full server message — invaluable for
        // diagnosing "no screenshots showed up" reports.
        // eslint-disable-next-line no-console
        console.warn(
          '[proctoring] evidence upload failed:',
          err?.response?.status,
          err?.response?.data || err?.message || err,
        );
        // Surface the FIRST failure as a toast so a broken upload
        // pipeline (auth expired, server 500, multipart parse error
        // etc.) isn't silently swallowed for the whole attempt. We
        // intentionally do NOT spam — one toast is enough to alert
        // the candidate that proctoring evidence isn't being saved.
        if (!errorToastShownRef.current) {
          errorToastShownRef.current = true;
          const detail =
            err?.response?.data?.message ||
            err?.message ||
            'Network error';
          toast.error(
            `Proctoring snapshot upload failed (${detail}). Your attempt continues — let your proctor know.`,
            { id: 'proctor-upload-error', duration: 8000, style: { maxWidth: 460 } },
          );
        }
      },
    });
    evidenceRef.current = collector;
    return () => {
      collector.stop();
      evidenceRef.current = null;
    };
  }, [quizId]);

  const [status, setStatus] = useState('idle');
  const [strikes, setStrikes] = useState(0);
  const [warning, setWarning] = useState(null);
  const [violations, setViolations] = useState([]);
  // Live face-alignment state. Used to render a positive indicator next
  // to the webcam tile so candidates know if they're framed correctly.
  // Throttled inside the setter so the React tree only rerenders when
  // the value actually changes.
  const [faceState, setFaceState] = useState('idle');

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
      onStrike: ({ totalStrikes, type }) => {
        setStrikes(totalStrikes);
        // Hybrid evidence: every strike triggers a 3-frame burst + the
        // last 10s of audio. Heartbeats keep the baseline timeline going
        // in parallel; we don't pause them here.
        const c = evidenceRef.current;
        if (c) c.captureBurst({ type, timestamp: new Date().toISOString() });
      },
      onFaceState: (next) => {
        // setState with the same value is a no-op in React, so this is
        // safe to fire on every probe.
        setFaceState(next);
      },
      onForceSubmit: async ({ reason, violations, message }) => {
        // Single terminal path — fires for strike-limit reached AND for
        // fullscreen-exit (and any other terminal monitor). The answers
        // are never marked as failed; we just drain in-flight evidence
        // so the auditor's timeline is complete, then hand off to the
        // page so it can submit cleanly.
        setStatus('submitting');
        const c = evidenceRef.current;
        if (c) {
          try { await c.captureExit(); } catch { /* ignore */ }
          try { await c.drain(2500); } catch { /* ignore */ }
        }
        if (onForceSubmitRef.current) {
          try {
            onForceSubmitRef.current({ reason, violations, message });
          } catch (err) {
            console.error('[proctoring] onForceSubmit handler threw', err);
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

  const attachVideo = useCallback((el) => {
    engine.attachVideo(el);
    evidenceRef.current?.attachVideo(el);
  }, [engine]);
  const attachStream = useCallback((s) => {
    engine.attachStream(s);
    evidenceRef.current?.attachStream(s);
  }, [engine]);

  const start = useCallback(async () => {
    if (!enabled) return;
    await engine.start();
    evidenceRef.current?.start();
    setStatus('active');
  }, [engine, enabled]);

  const stop = useCallback(() => {
    engine.stop();
    evidenceRef.current?.stop();
    setStatus('idle');
  }, [engine]);

  // Exposed so the page can take an explicit "exit" capture at submit time
  // (separate from the auto-capture on DQ — covers the clean-submit path).
  const captureExit = useCallback(async () => {
    const c = evidenceRef.current;
    if (!c) return;
    try { await c.captureExit(); } catch { /* ignore */ }
    try { await c.drain(2500); } catch { /* ignore */ }
  }, []);

  // We split the hook's return into a "controls" object (stable across
  // renders) and a "state" object (rerenders the consumer). The session
  // page wires start/stop/attach inside a useEffect that MUST NOT re-fire
  // every render — depending on `controls` instead of the whole hook
  // result is what keeps that effect from thrashing and triggering an
  // extra heartbeat capture per render.
  const controls = useMemo(
    () => ({ attachVideo, attachStream, start, stop, captureExit }),
    [attachVideo, attachStream, start, stop, captureExit],
  );

  return {
    status,
    warning,
    strikes,
    faceState,
    limit: DISQUALIFY_AT,
    violations,
    attachVideo,
    attachStream,
    start,
    stop,
    captureExit,
    controls,
    rules: VIOLATION_RULES,
  };
}
