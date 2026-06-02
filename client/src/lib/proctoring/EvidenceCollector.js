/**
 * EvidenceCollector — dual-source frame capture pipeline.
 *
 * What we capture
 * ───────────────
 *   - HEARTBEAT: one JPEG of the camera AND one JPEG of the screen
 *     every 30s while active. Gives auditors a baseline timeline of
 *     both the candidate AND what they were looking at throughout
 *     the attempt.
 *   - BURST: 3 frames at 1s intervals from BOTH sources, fired on
 *     a strike-severity event. Tagged with the violation type +
 *     timestamp so the auditor can pivot from a flagged moment to
 *     the actual footage on either feed.
 *   - EXIT: one frame from each source at submit time as the closing
 *     pair of stills.
 *
 * Audio was previously captured as a rolling MediaRecorder ring; it
 * was removed because (a) it didn't aid cheating detection meaningfully
 * given the visual evidence and (b) recording audio raised the privacy
 * bar significantly. Pure image pipeline now.
 *
 * Screen vs camera
 * ────────────────
 * The "screen" source comes from getDisplayMedia(), captured upfront
 * on the instructions page. It's a separate MediaStream — typically the
 * candidate's entire desktop or a chosen monitor. Attach it via
 * attachScreenStream() / attachScreenVideo(); if neither is attached
 * the collector silently degrades to camera-only.
 *
 * Why two pipelines and not one merged stream
 * ───────────────────────────────────────────
 * - Cleaner provenance: each row carries `source: CAMERA|SCREEN` so the
 *   admin viewer can render two separate timelines side-by-side.
 * - Different decode pipelines: the camera lives in an off-screen
 *   <video>, the screen capture lives in its own <video>. Each can fail
 *   independently without taking the other down.
 *
 * Lifecycle
 * ─────────
 *   const collector = new EvidenceCollector({ quizId, uploadFn });
 *   collector.attachVideo(cameraEl);
 *   collector.attachScreenVideo(screenEl);
 *   collector.attachStream(cameraStream);       // optional, for legacy callers
 *   collector.attachScreenStream(screenStream); // for 'ended' detection later
 *   collector.start();
 *   // ... on strike: collector.captureBurst({ type, timestamp });
 *   // ... on submit: await collector.captureExit(); collector.stop();
 *
 * uploadFn signature: (formData: FormData) => Promise<void>
 * The caller is responsible for wiring auth headers / retries / error
 * surfacing — this module only knows how to capture and pack.
 */

const HEARTBEAT_INTERVAL_MS = 30_000;
const BURST_FRAMES = 3;
const BURST_INTERVAL_MS = 1000;
// Camera frame uses a square-ish 640×480 to keep face crops legible.
// Screen frame uses 1280×720 — higher resolution because legibility of
// the quiz/question text in the screenshot is what makes it useful as
// cheating evidence. Both still compress well at quality 0.7.
const CAM_WIDTH = 640;
const CAM_HEIGHT = 480;
const SCREEN_WIDTH = 1280;
const SCREEN_HEIGHT = 720;
const JPEG_QUALITY = 0.7;

const noop = () => {};

export class EvidenceCollector {
  constructor({ quizId, uploadFn, onError = noop } = {}) {
    this._quizId = quizId;
    this._upload = uploadFn;
    this._onError = onError;

    // Camera source
    this._video = null;
    this._stream = null;
    // Screen source
    this._screenVideo = null;
    this._screenStream = null;

    this._camCanvas = null;
    this._screenCanvas = null;
    this._running = false;

    this._heartbeatTimer = null;
    // Defense-in-depth against accidental restart loops (e.g. a parent
    // re-rendering and re-triggering start()). We refuse to ship a
    // heartbeat pair if the previous one fired within this many ms.
    this._lastHeartbeatAt = 0;

    // Track in-flight uploads so stop() can wait for them when the page
    // navigates away. We don't block the UI, but we do want to finish
    // pushing the exit frame + the final burst.
    this._pending = new Set();
  }

  attachVideo(videoEl) { this._video = videoEl; }
  attachStream(stream) { this._stream = stream; }
  attachScreenVideo(videoEl) { this._screenVideo = videoEl; }
  attachScreenStream(stream) { this._screenStream = stream; }

  start() {
    if (this._running) return;
    this._running = true;
    this._ensureCanvases();
    // Heartbeat: one immediate pair so we have a baseline, then every 30s.
    this._captureHeartbeat();
    this._heartbeatTimer = setInterval(
      () => this._captureHeartbeat(),
      HEARTBEAT_INTERVAL_MS,
    );
  }

  stop() {
    if (!this._running) return;
    this._running = false;
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  /** Wait for in-flight uploads (best-effort, capped). Call before unmount. */
  async drain(timeoutMs = 3000) {
    if (this._pending.size === 0) return;
    await Promise.race([
      Promise.allSettled([...this._pending]),
      new Promise((r) => setTimeout(r, timeoutMs)),
    ]);
  }

  // ───────────────────────────────────────────────────────────────
  // Capture triggers — every trigger fires BOTH camera and screen.
  async captureBurst({ type, timestamp } = {}) {
    if (!this._running) return;
    for (let i = 0; i < BURST_FRAMES; i++) {
      // Stagger frames by BURST_INTERVAL_MS so we span ~3s of footage.
      // We resolve the promise immediately — uploads happen in the
      // background and don't block the proctoring loop.
      setTimeout(() => {
        this._captureFrame({
          source: 'CAMERA',
          kind: 'BURST',
          sequence: i + 1,
          linkedViolationType: type,
          linkedViolationTimestamp: timestamp,
        });
        this._captureFrame({
          source: 'SCREEN',
          kind: 'BURST',
          sequence: i + 1,
          linkedViolationType: type,
          linkedViolationTimestamp: timestamp,
        });
      }, i * BURST_INTERVAL_MS);
    }
  }

  async captureExit() {
    return Promise.all([
      this._captureFrame({ source: 'CAMERA', kind: 'EXIT' }),
      this._captureFrame({ source: 'SCREEN', kind: 'EXIT' }),
    ]);
  }

  _captureHeartbeat() {
    if (!this._running) return;
    // Coalesce restarts: if start() gets called repeatedly (parent re-render
    // bug, double-mount in StrictMode, etc.) we only push one heartbeat
    // pair per HEARTBEAT_INTERVAL_MS window. Otherwise every restart would
    // cost two extra frame uploads.
    const now = Date.now();
    if (now - this._lastHeartbeatAt < HEARTBEAT_INTERVAL_MS - 1000) return;
    this._lastHeartbeatAt = now;
    this._captureFrame({ source: 'CAMERA', kind: 'HEARTBEAT' }).catch(noop);
    this._captureFrame({ source: 'SCREEN', kind: 'HEARTBEAT' }).catch(noop);
  }

  // ───────────────────────────────────────────────────────────────
  // Frame capture (canvas → JPEG blob → multipart POST)
  _ensureCanvases() {
    if (!this._camCanvas) {
      this._camCanvas = document.createElement('canvas');
      this._camCanvas.width = CAM_WIDTH;
      this._camCanvas.height = CAM_HEIGHT;
    }
    if (!this._screenCanvas) {
      this._screenCanvas = document.createElement('canvas');
      this._screenCanvas.width = SCREEN_WIDTH;
      this._screenCanvas.height = SCREEN_HEIGHT;
    }
  }

  async _captureFrame({ source, kind, sequence, linkedViolationType, linkedViolationTimestamp } = {}) {
    const videoEl = source === 'SCREEN' ? this._screenVideo : this._video;
    const canvas = source === 'SCREEN' ? this._screenCanvas : this._camCanvas;
    const w = source === 'SCREEN' ? SCREEN_WIDTH : CAM_WIDTH;
    const h = source === 'SCREEN' ? SCREEN_HEIGHT : CAM_HEIGHT;
    if (!videoEl) {
      // Screen capture is OPTIONAL — silently skip if no stream was
      // attached. Camera being absent IS a bug worth surfacing.
      if (source !== 'SCREEN') {
        // eslint-disable-next-line no-console
        console.warn(`[proctoring] capture skipped (${source}/${kind}): no video element attached`);
      }
      return;
    }
    if (videoEl.readyState < 2) {
      // eslint-disable-next-line no-console
      console.warn(`[proctoring] capture skipped (${source}/${kind}): video readyState=${videoEl.readyState}`);
      return;
    }
    this._ensureCanvases();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      ctx.drawImage(videoEl, 0, 0, w, h);
    } catch (err) {
      // Tainted canvas (CORS) or video disposed mid-frame.
      // eslint-disable-next-line no-console
      console.warn(`[proctoring] drawImage failed (${source}/${kind}):`, err?.message || err);
      return;
    }
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    if (!blob) return;
    return this._ship(blob, {
      source,
      kind,
      filename: `${source.toLowerCase()}-${kind.toLowerCase()}-${Date.now()}.jpg`,
      sequence,
      linkedViolationType,
      linkedViolationTimestamp,
    });
  }

  // ───────────────────────────────────────────────────────────────
  // Multipart shipping
  _ship(blob, { source, kind, filename, sequence, linkedViolationType, linkedViolationTimestamp } = {}) {
    if (!this._upload || !this._quizId) return;
    const fd = new FormData();
    fd.append('file', blob, filename);
    fd.append('kind', kind);
    fd.append('source', source);
    fd.append('capturedAt', new Date().toISOString());
    if (sequence != null) fd.append('sequence', String(sequence));
    if (linkedViolationType) fd.append('linkedViolationType', linkedViolationType);
    if (linkedViolationTimestamp) fd.append('linkedViolationTimestamp', linkedViolationTimestamp);

    const job = Promise.resolve()
      .then(() => this._upload(fd))
      .catch((err) => this._onError?.(err))
      .finally(() => this._pending.delete(job));
    this._pending.add(job);
    return job;
  }
}
