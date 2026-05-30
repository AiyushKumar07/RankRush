/**
 * Proctoring rule book. All thresholds + strike weights live here so they
 * can be tuned without touching detection code.
 *
 * Strike model
 * ────────────
 * Each violation type contributes a `weight` to a running strike counter.
 * When the counter reaches DISQUALIFY_AT, the attempt is auto-submitted
 * with isProctoringFailure=true. A "warning" event surfaces a UI toast/banner
 * but doesn't add a strike — it's the candidate's chance to self-correct
 * (e.g. lean back into frame, return from a tab) before the next probe.
 *
 * Tuning rationale
 * ────────────────
 * - Face-absent: lenient. We tolerate ~10s of full absence and a warning at
 *   ~6s. Real candidates fidget, look at notes on the desk, sneeze. Three
 *   absences across the attempt = disqualify.
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
    severity: 'warn',     // surfaces but doesn't strike on first hit
    weight: 1,            // when it does strike, counts as one
    repeatable: true,
    cooldownMs: 8000,
  },
  PARTIAL_FACE: {
    label: 'Face partially out of frame',
    severity: 'warn',
    weight: 1,
    repeatable: true,
    cooldownMs: 10000,
  },
  MULTIPLE_FACES: {
    label: 'More than one person detected',
    severity: 'strike',
    weight: 2,            // two of these = DQ
    repeatable: true,
    cooldownMs: 6000,
  },
  TAB_SWITCH: {
    label: 'Switched away from the quiz tab',
    severity: 'warn',     // first time warns; counter still ticks below
    weight: 1,
    repeatable: true,
    cooldownMs: 1000,
    escalateAfter: 2,     // after 2 tab-switch warnings, every subsequent one is a strike
  },
  WINDOW_BLUR: {
    label: 'Quiz window lost focus',
    severity: 'warn',
    weight: 1,
    repeatable: true,
    cooldownMs: 2000,
    escalateAfter: 3,     // OS notifications often steal focus; more forgiving
  },
  FULLSCREEN_EXIT: {
    label: 'Exited full-screen mode',
    severity: 'warn',
    weight: 1,
    repeatable: true,
    cooldownMs: 1000,
    escalateAfter: 1,     // first one warns, second one is a strike
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
  WARN_FRAMES: 4,       // ~6s missing → first toast
  STRIKE_FRAMES: 7,     // ~10.5s missing → strike (1 of 3)
  MULTI_FACE_FRAMES: 3, // ~4.5s with 2+ faces → multi-face violation
  PARTIAL_AREA_RATIO: 0.6, // face bbox must cover ≥60% of its detected area
  MIN_FACE_PROBABILITY: 0.5,
};
