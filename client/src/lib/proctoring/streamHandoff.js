/**
 * Module-level handoff for the screen-share MediaStream.
 *
 * Why this exists
 * ───────────────
 * getDisplayMedia() requires a user gesture EVERY call. The user's "Begin
 * Quiz" click on the instructions page is the only gesture we get — once
 * we navigate to the session page the chain is broken, and any
 * getDisplayMedia() call there silently fails with "InvalidStateError"
 * (or worse, the browser shows a permission prompt the user doesn't
 * expect). So we acquire the stream on the instructions page and stash
 * it here for the session page to pick up.
 *
 * Camera streams don't have the same constraint (permission is sticky
 * once granted in a session) so we don't bother handing those off — the
 * session page can re-request silently.
 *
 * This is deliberately module-level and not a React Context: route
 * changes unmount React state, but module state survives. The handoff
 * is short-lived (set on instructions click, taken once on session
 * mount); we self-destruct on take() to avoid stale streams leaking.
 */

let screenStream = null;

export function setHandoffScreenStream(stream) {
  // Stop any prior stream that was never taken — keeps "X is sharing
  // your screen" indicator from staying lit if the user bails and
  // restarts.
  if (screenStream && screenStream !== stream) {
    try {
      screenStream.getTracks().forEach((t) => t.stop());
    } catch { /* ignore */ }
  }
  screenStream = stream;
}

export function takeHandoffScreenStream() {
  const s = screenStream;
  screenStream = null;
  return s;
}

export function peekHandoffScreenStream() {
  return screenStream;
}

export function clearHandoffScreenStream() {
  if (screenStream) {
    try {
      screenStream.getTracks().forEach((t) => t.stop());
    } catch { /* ignore */ }
    screenStream = null;
  }
}
