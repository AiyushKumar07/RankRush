/**
 * ProctoringEngine — framework-free orchestration of all monitors.
 *
 * Lifecycle:
 *   const engine = new ProctoringEngine({ onEvent, onStrike, onDisqualify });
 *   engine.attachVideo(videoEl);
 *   await engine.start();        // begins detection + listeners
 *   // ...student takes the quiz...
 *   engine.stop();               // detaches everything, freezes state
 *
 * Event channels:
 *   - onEvent({ type, severity, message, count, totalStrikes }) — every
 *     time something is observed (including duplicate warnings). The UI
 *     uses this for toasts.
 *   - onStrike({ type, message, totalStrikes, limit }) — fired when an
 *     observation adds to the strike counter (the UI shows X-of-N).
 *   - onForceSubmit({ reason, message, violations }) — fired once when
 *     the attempt should terminate: either totalStrikes >= DISQUALIFY_AT,
 *     fullscreen was exited, or any other terminal monitor tripped. The
 *     page is expected to submit cleanly with the answers gathered so
 *     far — we explicitly do NOT disqualify the candidate. Engine
 *     auto-stops after this fires.
 *
 * Why a class and not just hooks: detection runs on a wall-clock interval
 * and the listeners (visibility/blur/fullscreen) need imperative refs to
 * stay correct across React's StrictMode double-fire. Wrapping in a class
 * gives us one place to own that state.
 */
import { ensureLoaded, detectFaces } from './faceDetector.js';
import { VIOLATION_RULES, DISQUALIFY_AT, FACE_DETECTION } from './rules.js';

const noop = () => {};

export class ProctoringEngine {
  constructor({
    onEvent = noop,
    onStrike = noop,
    onFaceState = noop,
    onForceSubmit = noop,
  } = {}) {
    this._onEvent = onEvent;
    this._onStrike = onStrike;
    // Single terminal channel for ANY event that should end the attempt
    // (strike limit reached, fullscreen exited, camera stopped, etc.).
    // The candidate is never marked as failed — the page is expected to
    // submit cleanly with the answers gathered so far.
    this._onForceSubmit = onForceSubmit;
    // Per-probe status callback — receives one of:
    //   'ok'      — exactly one face, sufficient confidence + area
    //   'partial' — exactly one face but too small / low confidence
    //   'missing' — no face visible
    //   'multi'   — more than one face in frame
    // Used by the UI to render a positive alignment indicator. NOT a
    // violation channel — fires on every probe regardless of cooldown.
    this._onFaceState = onFaceState;

    this._video = null;
    this._stream = null;
    this._running = false;
    this._disqualified = false;

    // Per-violation occurrence counters (used by the escalateAfter rule).
    this._occurrences = Object.create(null);
    // Per-violation last-fire timestamps (used by the cooldownMs rule).
    this._lastFiredAt = Object.create(null);
    // Cumulative strike total — when it crosses DISQUALIFY_AT, fire DQ.
    this._totalStrikes = 0;
    // Audit trail: every event recorded, in order, for the BE payload.
    this._violations = [];

    // Face-detection probe state.
    this._faceTimer = null;
    this._noFaceFrames = 0;
    this._multiFaceFrames = 0;
    this._partialFaceFrames = 0;

    // Listeners (bound here so we can detach the exact same references).
    this._onVisibility = this._onVisibility.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._onFullscreenChange = this._onFullscreenChange.bind(this);
    this._onCopy = this._onCopy.bind(this);
    this._onPaste = this._onPaste.bind(this);
    this._onContextMenu = this._onContextMenu.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onStreamEnded = this._onStreamEnded.bind(this);
  }

  attachVideo(videoEl) {
    this._video = videoEl;
  }

  attachStream(stream) {
    // Detach any prior stream listeners.
    if (this._stream) {
      this._stream.getTracks().forEach((t) => t.removeEventListener('ended', this._onStreamEnded));
    }
    this._stream = stream;
    if (stream) {
      stream.getTracks().forEach((t) => t.addEventListener('ended', this._onStreamEnded));
    }
  }

  async start() {
    if (this._running || this._disqualified) return;
    this._running = true;

    try {
      await ensureLoaded();
    } catch (err) {
      // If models fail to load we still want the visibility/fullscreen
      // monitors to run — they don't depend on face-api. Just warn the
      // UI so it can surface a "face check unavailable" note.
      this._emit({
        type: 'MODEL_LOAD_FAILED',
        severity: 'warn',
        message: 'Face-detection model failed to load; visibility checks only.',
      });
    }

    // DOM listeners
    document.addEventListener('visibilitychange', this._onVisibility);
    document.addEventListener('fullscreenchange', this._onFullscreenChange);
    window.addEventListener('blur', this._onBlur);
    document.addEventListener('copy', this._onCopy);
    document.addEventListener('paste', this._onPaste);
    document.addEventListener('contextmenu', this._onContextMenu);
    document.addEventListener('keydown', this._onKeyDown);

    // Face-detection loop
    if (this._video) {
      this._faceTimer = setInterval(() => this._probeFace(), FACE_DETECTION.PROBE_MS);
    }
  }

  stop() {
    this._running = false;
    if (this._faceTimer) {
      clearInterval(this._faceTimer);
      this._faceTimer = null;
    }
    document.removeEventListener('visibilitychange', this._onVisibility);
    document.removeEventListener('fullscreenchange', this._onFullscreenChange);
    window.removeEventListener('blur', this._onBlur);
    document.removeEventListener('copy', this._onCopy);
    document.removeEventListener('paste', this._onPaste);
    document.removeEventListener('contextmenu', this._onContextMenu);
    document.removeEventListener('keydown', this._onKeyDown);
    if (this._stream) {
      this._stream.getTracks().forEach((t) =>
        t.removeEventListener('ended', this._onStreamEnded),
      );
    }
  }

  getViolations() {
    return this._violations.slice();
  }

  getTotalStrikes() {
    return this._totalStrikes;
  }

  // ────────────────────────────────────────────────────────────────────
  // Core report() — every monitor funnels through here so the rule table
  // is the single source of truth for severity + cooldown + escalation.
  report(type, details = '') {
    if (!this._running || this._disqualified) return;

    const rule = VIOLATION_RULES[type];
    if (!rule) return; // unknown type — bail rather than poison the counter

    // Cooldown — drop reports that arrive too soon after the last one of
    // the same type (e.g. a flapping fullscreenchange).
    const now = Date.now();
    if (rule.cooldownMs && now - (this._lastFiredAt[type] || 0) < rule.cooldownMs) {
      return;
    }
    this._lastFiredAt[type] = now;

    // One-shot violations (e.g. devtools): a second report is a no-op.
    const count = (this._occurrences[type] || 0) + 1;
    this._occurrences[type] = count;
    if (rule.repeatable === false && count > 1) return;

    // Decide whether this occurrence is a strike or just a warning.
    // - If the rule is already 'strike' severity, always strike.
    // - If it's 'warn' and escalateAfter is set, become a strike once
    //   the count crosses escalateAfter.
    const escalated =
      rule.escalateAfter != null && count > rule.escalateAfter;
    const isStrike = rule.severity === 'strike' || escalated;
    const severity = isStrike ? 'strike' : 'warn';

    const timestamp = new Date().toISOString();
    const message = details || rule.label;
    const record = { type, severity, message, timestamp, details, count };
    this._violations.push(record);

    this._emit({
      type,
      severity,
      message,
      count,
      totalStrikes: this._totalStrikes,
    });

    if (isStrike) {
      this._totalStrikes += rule.weight;
      this._onStrike({
        type,
        message,
        totalStrikes: this._totalStrikes,
        limit: DISQUALIFY_AT,
      });

      if (this._totalStrikes >= DISQUALIFY_AT) {
        // Strike-limit reached. We treat this as a clean auto-submit, NOT
        // a disqualification — the candidate's answers should still count.
        // Same channel as fullscreen-exit so the page only has one
        // terminal callback to handle.
        this._disqualified = true; // internal latch — prevents re-fire
        try {
          this._onForceSubmit({
            reason: type,
            message: `Auto-submitting attempt: ${message}`,
            violations: this._violations.slice(),
          });
        } catch { /* swallow — page handler shouldn't kill the engine */ }
        this.stop();
      }
    }
  }

  _emit(payload) {
    try { this._onEvent(payload); } catch { /* swallow — UI shouldn't kill the engine */ }
  }

  // ────────────────────────────────────────────────────────────────────
  // Face probe — runs on the timer; mutates frame counters and reports.
  async _probeFace() {
    if (!this._running || this._disqualified || !this._video) return;
    let result;
    try {
      result = await detectFaces(this._video);
    } catch {
      return;
    }
    if (!result) return;

    const { count, faces } = result;
    // Compute the live face-state and fire the indicator first — this is
    // independent of the violation-strike logic below.
    let faceState = 'missing';
    if (count > 1) faceState = 'multi';
    else if (count === 1) {
      const f0 = faces[0];
      const okScore = f0?.score >= FACE_DETECTION.MIN_FACE_PROBABILITY;
      const okSize = (f0?.areaRatio || 0) >= 0.02;
      faceState = okScore && okSize ? 'ok' : 'partial';
    }
    try { this._onFaceState(faceState); } catch { /* ignore */ }

    if (count === 0) {
      // No face at all in frame.
      this._noFaceFrames += 1;
      this._multiFaceFrames = 0;
      this._partialFaceFrames = 0;

      if (this._noFaceFrames === FACE_DETECTION.WARN_FRAMES) {
        // Soft warning — no strike yet.
        this.report('NO_FACE_DETECTED', 'No face visible — please return to the camera frame.');
      } else if (
        this._noFaceFrames >= FACE_DETECTION.STRIKE_FRAMES &&
        (this._noFaceFrames - FACE_DETECTION.STRIKE_FRAMES) % FACE_DETECTION.STRIKE_FRAMES === 0
      ) {
        // Re-strike every STRIKE_FRAMES additional frames the face stays
        // missing, so a candidate who walks away accumulates strikes
        // instead of getting a single forgiveness card forever.
        // (cooldownMs in the rule keeps this from spamming.)
        this.report('NO_FACE_DETECTED', 'Face still not visible — repeated absence.');
      }
    } else if (count > 1) {
      // STRICT: a second face is rarely accidental.
      this._multiFaceFrames += 1;
      this._noFaceFrames = 0;
      this._partialFaceFrames = 0;
      if (this._multiFaceFrames === FACE_DETECTION.MULTI_FACE_FRAMES) {
        this.report(
          'MULTIPLE_FACES',
          `Detected ${count} people in frame — only the candidate is allowed.`,
        );
      }
    } else {
      // Exactly one face. Check that enough of it is visible.
      this._noFaceFrames = 0;
      this._multiFaceFrames = 0;
      const f = faces[0];
      const sufficient =
        f.score >= FACE_DETECTION.MIN_FACE_PROBABILITY &&
        f.areaRatio >= 0.02; // sanity: face must occupy at least 2% of frame
      if (!sufficient) {
        this._partialFaceFrames += 1;
        if (this._partialFaceFrames === FACE_DETECTION.WARN_FRAMES) {
          this.report(
            'PARTIAL_FACE',
            'Face is too small or partially out of frame — please move closer / re-center.',
          );
        }
      } else {
        this._partialFaceFrames = 0;
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // DOM listeners
  _onVisibility() {
    if (document.hidden) {
      this.report('TAB_SWITCH', 'Quiz tab is no longer visible.');
    }
  }
  _onBlur() {
    // Browser blur can fire when the dev tools open. Differentiate later
    // via the DEVTOOLS heuristic; for now, treat blur as window focus loss.
    this.report('WINDOW_BLUR', 'Quiz window lost focus.');
  }
  _onFullscreenChange() {
    if (document.fullscreenElement) return;
    if (!this._running || this._disqualified) return;
    // Fullscreen-exit is a HARD STOP but NOT a disqualification — the
    // user's existing answers should still count. We:
    //   1. Record the event in the audit trail so admins can see why
    //      the attempt ended early.
    //   2. Emit a warn-level event so the UI can flash a toast.
    //   3. Fire onForceSubmit so the page submits with no DQ flag.
    //   4. Stop the engine so we don't double-fire other monitors.
    const timestamp = new Date().toISOString();
    const record = {
      type: 'FULLSCREEN_EXIT',
      severity: 'warn',
      message: 'Quiz exited full-screen — auto-submitting attempt.',
      timestamp,
      details: '',
      count: 1,
    };
    this._violations.push(record);
    this._emit({
      type: 'FULLSCREEN_EXIT',
      severity: 'warn',
      message: record.message,
      count: 1,
      totalStrikes: this._totalStrikes,
    });
    // Use the same _disqualified latch to make this one-shot — re-entering
    // fullscreen and exiting again shouldn't trigger a second submit.
    this._disqualified = true;
    try {
      this._onForceSubmit({
        reason: 'FULLSCREEN_EXIT',
        message: record.message,
        violations: this._violations.slice(),
      });
    } catch { /* swallow — page handler shouldn't kill the engine */ }
    this.stop();
  }
  _onCopy(e) {
    e.preventDefault();
    this.report('COPY_PASTE', 'Copy attempt blocked.');
  }
  _onPaste(e) {
    e.preventDefault();
    this.report('COPY_PASTE', 'Paste attempt blocked.');
  }
  _onContextMenu(e) {
    e.preventDefault();
  }
  _onKeyDown(e) {
    // Block the common devtools shortcuts. Not bulletproof (a determined
    // user can open via menu) but raises the bar.
    const key = (e.key || '').toLowerCase();
    if (
      key === 'f12' ||
      (e.ctrlKey && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) ||
      (e.metaKey && e.altKey && (key === 'i' || key === 'j' || key === 'c'))
    ) {
      e.preventDefault();
      this.report('DEVTOOLS_OPENED', 'Developer tools shortcut detected.');
    }
  }
  _onStreamEnded() {
    this.report('CAMERA_STOPPED', 'Camera/microphone track ended unexpectedly.');
  }
}
