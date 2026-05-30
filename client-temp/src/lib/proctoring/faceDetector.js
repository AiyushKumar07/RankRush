/**
 * Face-detection wrapper around @vladmandic/face-api (TinyFaceDetector).
 *
 * Why TinyFaceDetector and not a heavier model:
 *   - 190KB weights, single .bin file. Loads cold in ~120ms.
 *   - Single-shot CPU inference is ~25ms on a low-end laptop, fine at 1500ms probes.
 *   - We only need {count, bbox, score} per frame — no landmarks/embeddings.
 *
 * The module is a singleton: the same model file is shared across the
 * instructions page (where it's used as a "found a face" preflight check)
 * and the session page (the live monitor). It's safe to call ensureLoaded()
 * multiple times in parallel — the first call wins, the rest await the
 * same promise.
 */
import * as faceapi from '@vladmandic/face-api';

let loadPromise = null;

export function ensureLoaded() {
  if (loadPromise) return loadPromise;
  loadPromise = faceapi.nets.tinyFaceDetector
    .loadFromUri('/models')
    .catch((err) => {
      // Reset so retries are possible (e.g. transient network failure).
      loadPromise = null;
      throw err;
    });
  return loadPromise;
}

const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,        // smaller = faster; 224 is enough for face presence
  scoreThreshold: 0.5,   // matches FACE_DETECTION.MIN_FACE_PROBABILITY default
});

/**
 * Runs one inference on the given HTMLVideoElement.
 * Returns `{ count, faces: [{box, score, areaRatio}] }` or null if the
 * video isn't ready. areaRatio = (face bbox area) / (video frame area)
 * so callers can decide what "in frame" means for their tolerance.
 */
export async function detectFaces(videoEl) {
  if (!videoEl || videoEl.readyState < 2) return null;
  const detections = await faceapi.detectAllFaces(videoEl, DETECTOR_OPTIONS);
  if (!detections || detections.length === 0) {
    return { count: 0, faces: [] };
  }
  const frameW = videoEl.videoWidth || 1;
  const frameH = videoEl.videoHeight || 1;
  const frameArea = frameW * frameH;
  const faces = detections.map((d) => {
    const box = d.box || d._box;
    const area = (box?.width || 0) * (box?.height || 0);
    return {
      box: { x: box?.x, y: box?.y, width: box?.width, height: box?.height },
      score: d.score,
      areaRatio: frameArea > 0 ? area / frameArea : 0,
    };
  });
  return { count: faces.length, faces };
}
