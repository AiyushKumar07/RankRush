/**
 * Proctoring rule book. All thresholds + strike weights live here so they
 * can be tuned without touching detection code.
 *
 * Strike model
 * ────────────
 * Each violation type contributes a `weight` to a running strike counter.
 * When the counter reaches DISQUALIFY_AT the attempt is **auto-submitted**
 * — the candidate's answers still count and the score is computed normally,
 * isProctoringFailure stays false. The constant is kept named DISQUALIFY_AT
 * for historical reasons; treat it as the "auto-submit threshold." A
 * "warning" event surfaces a UI toast/banner but doesn't add a strike —
 * it's the candidate's chance to self-correct (lean back into frame,
 * return from a tab) before the next probe.
 *
 * Tuning rationale
 * ────────────────
 * - Face-absent: lenient. We tolerate ~10s of full absence and a warning at
 *   ~6s. Real candidates fidget, look at notes on the desk, sneeze. Three
 *   absences across the attempt = auto-submit (NOT disqualification — the
 *   candidate's answers still count; we just close the attempt early).
 * - Multiple faces: STRICT. A second face in frame is rarely accidental.
 *   ~4.5s sustained → instant strike of 2 (only one more strike to DQ).
 * - Tab/window switch: STRICT but graded. First switch warns, repeats
 *   strike fast. Common-attack vector for cheating.
 * - Fullscreen exit: same as tab switch.
 * - Window blur (clicked outside without tab change): half-weight strike,
 *   since some OSes blur on system notifications.
 *
 * Object/device detection (cell phone, second screen) is wired through
 * the same strike system at weight 3 — one detection = instant DQ.
 */
export const DISQUALIFY_AT = 3;

export const VIOLATION_RULES = {
  NO_FACE_DETECTED: {
    label: 'Face not visible',
    severity: 'warn',     // first hit is a soft warn — they can lean back in
    weight: 1,
    repeatable: true,
    cooldownMs: 5000,     // re-fire as soon as 5s — keeps strikes accumulating
    escalateAfter: 1,     // first warns, every subsequent absence is a strike
  },
  PARTIAL_FACE: {
    label: 'Face partially out of frame',
    severity: 'warn',
    weight: 1,
    repeatable: true,
    cooldownMs: 8000,
    escalateAfter: 2,     // 2 free passes, then strikes (face-too-small is noisy)
  },
  MULTIPLE_FACES: {
    label: 'More than one person detected',
    severity: 'strike',
    weight: 2,            // two of these = DQ
    repeatable: true,
    cooldownMs: 5000,
  },
  TAB_SWITCH: {
    label: 'Switched away from the quiz tab',
    severity: 'warn',     // first time warns; counter still ticks below
    weight: 1,
    repeatable: true,
    cooldownMs: 1000,
    escalateAfter: 1,     // first warn (free), every subsequent switch is a strike
  },
  WINDOW_BLUR: {
    label: 'Quiz window lost focus',
    severity: 'warn',
    weight: 1,
    repeatable: true,
    cooldownMs: 2000,
    escalateAfter: 2,     // 2 free passes — OS notifications often steal focus
  },
  FULLSCREEN_EXIT: {
    // Special-cased: the engine routes this to onForceSubmit (clean
    // auto-submit) rather than the strike path. We keep an entry in
    // the rule table so the violation still serialises with a label
    // when it's recorded in the audit trail.
    label: 'Exited full-screen mode — attempt auto-submitted',
    severity: 'warn',
    weight: 0,
    repeatable: false,
    cooldownMs: 0,
  },
  DEVTOOLS_OPENED: {
    label: 'Developer tools detected',
    severity: 'strike',
    weight: 3,            // instant DQ
    repeatable: false,
    cooldownMs: 0,
  },
  COPY_PASTE: {
    label: 'Copy/paste attempt blocked',
    severity: 'warn',
    weight: 1,
    repeatable: true,
    cooldownMs: 5000,
    escalateAfter: 2,
  },
  CAMERA_STOPPED: {
    label: 'Camera feed was stopped',
    severity: 'strike',
    weight: 3,
    repeatable: false,
    cooldownMs: 0,
  },
  SCREEN_SHARE_STOPPED: {
    // Same shape as CAMERA_STOPPED — one-shot, weight === DISQUALIFY_AT
    // so the strike-limit path fires immediately and the page auto-
    // submits with the answers gathered so far.
    label: 'Screen sharing was stopped',
    severity: 'strike',
    weight: 3,
    repeatable: false,
    cooldownMs: 0,
  },
  // Object detection (phone, laptop, etc.) — when wired up via coco-ssd.
  // Strict: one positive detection is enough to DQ.
  PROHIBITED_OBJECT: {
    label: 'Prohibited device in frame',
    severity: 'strike',
    weight: 3,
    repeatable: false,
    cooldownMs: 0,
  },
};

// Face-detection tuning. The candidate is allowed to look down at scratch
// paper, sneeze, or turn momentarily. We probe at PROBE_MS, escalate to a
// soft warning after WARN_FRAMES, and only count a strike after STRIKE_FRAMES
// consecutive misses. PARTIAL_AREA_RATIO defines how much of the face needs
// to be inside the frame's "safe rectangle" to count as visible — 0.6 means
// 60% overlap is enough (covers the "~80% of face visible" requirement
// generously).
export const FACE_DETECTION = {
  PROBE_MS: 1500,
  WARN_FRAMES: 2,       // ~3s missing → first toast (was 4.5s, too lenient)
  STRIKE_FRAMES: 4,     // ~6s missing → re-fire (counted as strike via escalateAfter:1)
  MULTI_FACE_FRAMES: 2, // ~3s with 2+ faces → multi-face violation
  PARTIAL_AREA_RATIO: 0.6, // face bbox must cover ≥60% of its detected area
  MIN_FACE_PROBABILITY: 0.5,
};
