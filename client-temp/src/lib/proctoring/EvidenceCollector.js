/**
 * EvidenceCollector — hybrid capture pipeline.
 *
 * What we capture
 * ───────────────
 *   - HEARTBEAT: one 640×480 JPEG every 30s while active. Gives auditors
 *     a baseline timeline of where the candidate's face was throughout
 *     the attempt.
 *   - BURST: 3 frames at 1s intervals, fired on a strike-severity event.
 *     Each frame is tagged with the violation type + timestamp so the
 *     auditor can pivot from a flagged moment to the actual footage.
 *   - AUDIO: a ~10s rolling MediaRecorder buffer. Continuously recorded
 *     into a ring; only flushed to the server on a strike trigger so the
 *     vast majority of attempts never ship a single audio byte.
 *   - EXIT: one frame at submit time as the closing photo.
 *
 * Why this shape
 * ──────────────
 * - Storage / bandwidth: a 30-min attempt typically ships ~60 heartbeats
 *   + 0–10 bursts + 0–3 audio clips → ~6 MB total. A full continuous
 *   recording would be ~120 MB at 700 kbps. 20× cheaper to store,
 *   20× cheaper to push through Cloudinary, and easier to defend on
 *   privacy grounds ("we keep a still every 30s + footage of any flagged
 *   moments" reads better in a DPA than "we record everything").
 * - Auditor UX: 95% of investigator queries are "show me the 30 seconds
 *   around the violation." A burst delivers that directly; a full video
 *   forces a scrub.
 * - Backend reuse: every artifact funnels through the same multipart
 *   /quizzes/:id/evidence endpoint, so adding a new capture trigger
 *   later (e.g. a "stand and stretch" detection) doesn't need server work.
 *
 * Lifecycle
 * ─────────
 *   const collector = new EvidenceCollector({ quizId, uploadFn });
 *   collector.attachVideo(videoEl);
 *   collector.attachStream(stream);   // for audio ring
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
const AUDIO_RING_SECS = 10;
const FRAME_WIDTH = 640;
const FRAME_HEIGHT = 480;
const JPEG_QUALITY = 0.7;
const AUDIO_MIME = 'audio/webm;codecs=opus';

const noop = () => {};

export class EvidenceCollector {
  constructor({ quizId, uploadFn, onError = noop } = {}) {
    this._quizId = quizId;
    this._upload = uploadFn;
    this._onError = onError;

    this._video = null;
    this._stream = null;
    this._canvas = null;
    this._running = false;

    this._heartbeatTimer = null;
    this._recorder = null;
    this._audioChunks = [];   // ring buffer
    this._audioStartedAt = 0;
    this._audioSliceMs = 2000; // chunk size for the ring
    // Defense-in-depth against accidental restart loops (e.g. a parent
    // re-rendering and re-triggering start()). We refuse to ship a
    // heartbeat if the previous one fired within this many ms.
    this._lastHeartbeatAt = 0;

    // Track in-flight uploads so stop() can wait for them when the page
    // navigates away. We don't block the UI, but we do want to finish
    // pushing the exit frame + the final burst.
    this._pending = new Set();
  }

  attachVideo(videoEl) { this._video = videoEl; }
  attachStream(stream) { this._stream = stream; }

  start() {
    if (this._running) return;
    this._running = true;
    this._ensureCanvas();
    // Heartbeat: one immediate capture so we have a baseline, then every 30s.
    this._captureHeartbeat();
    this._heartbeatTimer = setInterval(() => this._captureHeartbeat(), HEARTBEAT_INTERVAL_MS);
    this._startAudioRing();
  }

  stop() {
    if (!this._running) return;
    this._running = false;
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
    this._stopAudioRing();
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
  // Capture triggers
  async captureBurst({ type, timestamp } = {}) {
    if (!this._running || !this._video) return;
    for (let i = 0; i < BURST_FRAMES; i++) {
      // Stagger frames by BURST_INTERVAL_MS so we span ~3s of footage.
      // We resolve the promise immediately — uploads happen in the
      // background and don't block the proctoring loop.
      setTimeout(() => {
        this._captureFrame({
          kind: 'BURST',
          sequence: i + 1,
          linkedViolationType: type,
          linkedViolationTimestamp: timestamp,
        });
      }, i * BURST_INTERVAL_MS);
    }
    // Flush the audio ring at the same trigger.
    this._flushAudio({ linkedViolationType: type, linkedViolationTimestamp: timestamp });
  }

  async captureExit() {
    return this._captureFrame({ kind: 'EXIT' });
  }

  _captureHeartbeat() {
    if (!this._running) return;
    // Coalesce restarts: if start() gets called repeatedly (parent re-render
    // bug, double-mount in StrictMode, etc.) we only push one heartbeat
    // per HEARTBEAT_INTERVAL_MS window. Otherwise every restart would
    // cost an extra frame upload.
    const now = Date.now();
    if (now - this._lastHeartbeatAt < HEARTBEAT_INTERVAL_MS - 1000) return;
    this._lastHeartbeatAt = now;
    this._captureFrame({ kind: 'HEARTBEAT' }).catch(noop);
  }

  // ───────────────────────────────────────────────────────────────
  // Frame capture (canvas → JPEG blob → multipart POST)
  _ensureCanvas() {
    if (this._canvas) return;
    this._canvas = document.createElement('canvas');
    this._canvas.width = FRAME_WIDTH;
    this._canvas.height = FRAME_HEIGHT;
  }

  async _captureFrame({ kind, sequence, linkedViolationType, linkedViolationTimestamp } = {}) {
    if (!this._video) {
      // eslint-disable-next-line no-console
      console.warn(`[proctoring] capture skipped (${kind}): no video element attached`);
      return;
    }
    if (this._video.readyState < 2) {
      // eslint-disable-next-line no-console
      console.warn(`[proctoring] capture skipped (${kind}): video readyState=${this._video.readyState}`);
      return;
    }
    this._ensureCanvas();
    const ctx = this._canvas.getContext('2d');
    if (!ctx) return;
    try {
      ctx.drawImage(this._video, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    } catch {
      // Tainted canvas (CORS) or video disposed mid-frame — drop silently.
      return;
    }
    const blob = await new Promise((resolve) =>
      this._canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    if (!blob) return;
    return this._ship(blob, {
      kind,
      filename: `${kind.toLowerCase()}-${Date.now()}.jpg`,
      sequence,
      linkedViolationType,
      linkedViolationTimestamp,
    });
  }

  // ───────────────────────────────────────────────────────────────
  // Audio ring — continuously records 2s chunks; on flush we concat
  // the last AUDIO_RING_SECS / sliceMs chunks into one Blob and ship it.
  _startAudioRing() {
    if (!this._stream) return;
    if (typeof MediaRecorder === 'undefined') return;
    let mime = AUDIO_MIME;
    if (!MediaRecorder.isTypeSupported(mime)) {
      mime = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mime)) return;
    }
    // We split the stream so we only encode audio (video tracks would
    // bloat the recorder buffer and ruin the storage savings).
    const audioOnly = new MediaStream(this._stream.getAudioTracks());
    if (audioOnly.getAudioTracks().length === 0) return;
    try {
      this._recorder = new MediaRecorder(audioOnly, { mimeType: mime, audioBitsPerSecond: 24_000 });
    } catch {
      return;
    }
    this._audioChunks = [];
    const maxChunks = Math.ceil((AUDIO_RING_SECS * 1000) / this._audioSliceMs);
    this._recorder.ondataavailable = (e) => {
      if (!e.data || e.data.size === 0) return;
      this._audioChunks.push(e.data);
      if (this._audioChunks.length > maxChunks) this._audioChunks.shift();
    };
    this._recorder.start(this._audioSliceMs);
    this._audioStartedAt = Date.now();
  }

  _stopAudioRing() {
    if (this._recorder && this._recorder.state !== 'inactive') {
      try { this._recorder.stop(); } catch { /* ignore */ }
    }
    this._recorder = null;
    this._audioChunks = [];
  }

  async _flushAudio({ linkedViolationType, linkedViolationTimestamp } = {}) {
    if (!this._recorder || this._audioChunks.length === 0) return;
    // Snapshot the ring without stopping the recorder.
    const chunks = this._audioChunks.slice();
    const blob = new Blob(chunks, { type: this._recorder.mimeType || AUDIO_MIME });
    if (blob.size === 0) return;
    return this._ship(blob, {
      kind: 'AUDIO',
      filename: `audio-${Date.now()}.webm`,
      linkedViolationType,
      linkedViolationTimestamp,
    });
  }

  // ───────────────────────────────────────────────────────────────
  // Multipart shipping
  _ship(blob, { kind, filename, sequence, linkedViolationType, linkedViolationTimestamp } = {}) {
    if (!this._upload || !this._quizId) return;
    const fd = new FormData();
    fd.append('file', blob, filename);
    fd.append('kind', kind);
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
