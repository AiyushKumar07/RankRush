import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Mic,
  ShieldCheck,
  Clock,
  Coins,
  AlertTriangle,
  Check,
  Loader2,
  Eye,
  EyeOff,
  Play,
  Wifi,
  Maximize2,
  Ban,
  FileText,
} from "lucide-react";
import RRBrand from "../../components/brand/RRBrand";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { studentAPI } from "../../services/api";
import {
  setHandoffScreenStream,
  clearHandoffScreenStream,
} from "../../lib/proctoring/streamHandoff";
import "./QuizInstructionsPage.css";

const RULES = [
  {
    icon: Maximize2,
    title: "Stay in full-screen",
    body: "Exiting full-screen (Esc, Alt+Tab) auto-submits your attempt immediately with whatever answers you have at that moment. Tab switches are also tracked.",
  },
  {
    icon: Ban,
    title: "No external help",
    body: "Notes, second screens, AI tools and other people are not allowed during the attempt.",
  },
  {
    icon: Eye,
    title: "Camera stays on",
    body: "Your webcam streams locally for proctoring. Keep your face clearly visible the whole time.",
  },
  {
    icon: Mic,
    title: "Microphone stays on",
    body: "Background audio is monitored for voices. Sit in a quiet, well-lit space.",
  },
  {
    icon: Wifi,
    title: "Stable internet",
    body: "If you disconnect, your answers are auto-saved — but you only have until the timer runs out.",
  },
  {
    icon: FileText,
    title: "One attempt counts",
    body: "Once you submit (or the timer ends), the attempt is final and the score is locked.",
  },
];

export default function QuizInstructionsPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [quiz, setQuiz] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(true);

  const [permState, setPermState] = useState("idle"); // idle | requesting | granted | denied
  const [permError, setPermError] = useState(null);
  // Screen-share is a SEPARATE permission flow because getDisplayMedia
  // requires its own user gesture per call. We acquire it on the
  // instructions page (the user's gesture) and hand it off via the
  // streamHandoff module to the session page.
  const [screenPermState, setScreenPermState] = useState("idle"); // idle | requesting | granted | denied
  const [screenPermError, setScreenPermError] = useState(null);
  const screenStreamRef = useRef(null);
  const [showPreview, setShowPreview] = useState(true);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingQuiz(true);
    studentAPI
      .getQuiz(quizId)
      .then((res) => {
        if (cancelled) return;
        setQuiz(res?.data?.quiz ?? res?.quiz ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setQuiz(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingQuiz(false);
      });
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  const stopStream = useCallback(() => {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Only stops the LOCAL preview stream — the handoff stream (if any)
  // is intentionally NOT stopped, because the session page will pick it
  // up. If the user navigates away without starting the quiz, the
  // unmount cleanup below handles that case too.
  useEffect(() => () => {
    stopStream();
    // If we acquired a screen stream but the user backed out without
    // starting the quiz, kill it so the "X is sharing" indicator goes
    // away. handoff.clear() also stops the underlying tracks.
    if (screenStreamRef.current) {
      try {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch { /* ignore */ }
      screenStreamRef.current = null;
      clearHandoffScreenStream();
    }
  }, [stopStream]);

  // When the <video> element re-mounts (show/hide preview), reattach the live stream.
  useEffect(() => {
    if (showPreview && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [showPreview, permState]);

  const requestPermissions = useCallback(async () => {
    setPermError(null);
    setPermState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360 },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPermState("granted");
    } catch (err) {
      setPermState("denied");
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setPermError("Permission denied — enable camera and microphone in your browser settings, then retry.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setPermError("No camera or microphone detected. Plug one in and retry.");
      } else if (name === "NotReadableError") {
        setPermError("Camera or mic is being used by another app. Close it and retry.");
      } else {
        setPermError(err?.message || "Unable to access camera and microphone.");
      }
    }
  }, []);

  const togglePreview = useCallback(() => {
    setShowPreview((v) => !v);
  }, []);

  const requestScreenShare = useCallback(async () => {
    setScreenPermError(null);
    setScreenPermState("requesting");
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setScreenPermState("denied");
      setScreenPermError("Your browser doesn't support screen sharing. Try Chrome, Edge, or Firefox on a desktop.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 5 },   // we only sample frames every 30s — 5fps is plenty
        audio: false,              // we don't capture screen audio
      });
      // Validate the candidate chose ENTIRE SCREEN, not a single tab or
      // window. The displaySurface hint isn't always populated (older
      // browsers) but when it is, it's the cleanest signal.
      const track = stream.getVideoTracks()[0];
      const settings = track?.getSettings?.() || {};
      const surface = settings.displaySurface;
      if (surface && surface !== 'monitor') {
        // Surface is 'window' (single window) or 'browser' (single tab).
        // Either lets the candidate hide their cheating behind alt-tab.
        stream.getTracks().forEach((t) => t.stop());
        setScreenPermState("denied");
        setScreenPermError("Please share your ENTIRE SCREEN, not just a window or tab. Click 'Enable screen sharing' again and choose 'Entire screen'.");
        return;
      }
      // If they stop sharing from the browser's "Stop sharing" pill at
      // any point on THIS page, fall back to the un-granted state so
      // the start button disables again.
      track?.addEventListener('ended', () => {
        screenStreamRef.current = null;
        clearHandoffScreenStream();
        setScreenPermState("idle");
      });
      screenStreamRef.current = stream;
      setHandoffScreenStream(stream);
      setScreenPermState("granted");
    } catch (err) {
      setScreenPermState("denied");
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setScreenPermError("You declined the screen-share prompt. Click again and approve to continue.");
      } else if (name === "NotFoundError") {
        setScreenPermError("No screen available to share.");
      } else {
        setScreenPermError(err?.message || "Unable to start screen sharing.");
      }
    }
  }, []);

  const canStart =
    permState === "granted" && screenPermState === "granted" && agreed;

  const handleStart = useCallback(async () => {
    if (!canStart) return;
    // Request fullscreen here while we still have a user gesture — browsers
    // block requestFullscreen() outside click/keydown handlers, so the
    // session page can't ask for it on mount after a route change.
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch { /* user can re-enter manually if blocked */ }
    // Stop preview camera tracks; the session page will request its own.
    // INTENTIONALLY DO NOT stop the screen stream — it lives in the
    // handoff module and the session page will take ownership of it
    // (getDisplayMedia needs a user gesture every call, so we can't
    // re-request after navigation).
    stopStream();
    // Also clear the local ref so the unmount-cleanup effect doesn't
    // stop the screen stream we just handed off.
    screenStreamRef.current = null;
    navigate(`/app/quizzes/${quizId}/session`);
  }, [canStart, navigate, quizId, stopStream]);

  const title = quiz?.title || (loadingQuiz ? "Loading quiz…" : "Quiz");
  const subject = quiz?.subject || "";
  const duration = quiz?.timeLimitMins ?? quiz?.durationMinutes ?? null;
  const questionCount = quiz?.totalQuestions ?? quiz?.questions?.length ?? null;
  const attemptCost = quiz?.attemptCost ?? null;
  const difficulty = quiz?.difficulty || null;

  return (
    <div className="qi-page">
      <header className="qi-top">
        <div className="qi-top-left">
          <Link to="/app/quizzes" className="qi-back" aria-label="Back to quizzes">
            <ArrowLeft size={16} />
            <span>Back</span>
          </Link>
          <RRBrand to="/app" />
        </div>
        <div className="qi-top-right">
          <ThemeToggle />
        </div>
      </header>

      <div className="qi-shell">
        <div className="qi-header-card">
          <div className="qi-eyebrow">
            <ShieldCheck size={12} /> Proctored attempt
          </div>
          <h1 className="qi-title">{title}</h1>
          <div className="qi-meta-row">
            {subject && <span className="qi-meta-chip">{subject}</span>}
            {difficulty && (
              <span className={`qi-meta-chip diff-${String(difficulty).toLowerCase()}`}>
                {difficulty}
              </span>
            )}
            {duration != null && (
              <span className="qi-meta-chip">
                <Clock size={12} /> {duration} min
              </span>
            )}
            {questionCount != null && (
              <span className="qi-meta-chip">
                {questionCount} questions
              </span>
            )}
            {attemptCost != null && (
              <span className="qi-meta-chip cost">
                <Coins size={12} /> {attemptCost} {attemptCost === 1 ? "token" : "tokens"}
              </span>
            )}
          </div>
        </div>

        <div className="qi-grid">
          {/* LEFT — Camera & mic gate */}
          <section className="qi-card qi-media">
            <div className="qi-card-head">
              <div className="qi-card-title">
                <Camera size={16} />
                <span>Camera & microphone check</span>
              </div>
              <div className="qi-card-head-actions">
                {permState === "granted" && (
                  <button
                    type="button"
                    className="qi-preview-pill"
                    onClick={togglePreview}
                    aria-label={showPreview ? "Hide preview" : "Show preview"}
                  >
                    {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
                    {showPreview ? "Hide" : "Show"}
                  </button>
                )}
                <PermBadge state={permState} />
              </div>
            </div>

            {showPreview ? (
              <div className="qi-preview">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="qi-video"
                />
                {permState !== "granted" && (
                  <div className="qi-preview-empty">
                    <Camera size={28} />
                    <span>
                      {permState === "requesting"
                        ? "Requesting access…"
                        : "Camera preview will appear here"}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="qi-preview-collapsed"
                onClick={togglePreview}
              >
                <EyeOff size={20} />
                <div className="qi-preview-collapsed-text">
                  <strong>Preview hidden</strong>
                  <span>Camera is still recording — click to show preview</span>
                </div>
                <span className="qi-preview-collapsed-cta">
                  <Eye size={13} />
                  Show
                </span>
              </button>
            )}

            <div className="qi-media-actions">
              {permState !== "granted" ? (
                <button
                  type="button"
                  className="btn btn-accent qi-allow-btn"
                  onClick={requestPermissions}
                  disabled={permState === "requesting"}
                >
                  {permState === "requesting" ? (
                    <>
                      <Loader2 size={14} className="spin" />
                      Requesting…
                    </>
                  ) : (
                    <>
                      <Camera size={14} />
                      Allow camera & microphone
                    </>
                  )}
                </button>
              ) : (
                <div className="qi-perm-success">
                  <Check size={14} />
                  Camera and microphone are active
                </div>
              )}

              {permState === "denied" && permError && (
                <div className="qi-perm-error">
                  <AlertTriangle size={14} />
                  <span>{permError}</span>
                </div>
              )}

              {/* Screen-share permission. Always rendered so candidates
                  can see what's coming next; only enabled after the
                  camera step succeeds so the prompts don't pile up. */}
              {permState === "granted" && screenPermState !== "granted" ? (
                <button
                  type="button"
                  className="btn btn-accent qi-allow-btn"
                  onClick={requestScreenShare}
                  disabled={screenPermState === "requesting"}
                  style={{ marginTop: 10 }}
                >
                  {screenPermState === "requesting" ? (
                    <>
                      <Loader2 size={14} className="spin" />
                      Waiting for selection…
                    </>
                  ) : (
                    <>
                      <Maximize2 size={14} />
                      Enable screen sharing
                    </>
                  )}
                </button>
              ) : screenPermState === "granted" ? (
                <div className="qi-perm-success" style={{ marginTop: 10 }}>
                  <Check size={14} />
                  Screen sharing is active
                </div>
              ) : null}

              {screenPermState === "denied" && screenPermError && (
                <div className="qi-perm-error">
                  <AlertTriangle size={14} />
                  <span>{screenPermError}</span>
                </div>
              )}
            </div>

            <ul className="qi-perm-bullets">
              <li>
                <Camera size={12} />
                Your webcam feed stays on your device — only flagged moments are kept.
              </li>
              <li>
                <Maximize2 size={12} />
                We snapshot your screen every 30 s and on each warning. Audio is not recorded.
              </li>
            </ul>
          </section>

          {/* RIGHT — Rules */}
          <section className="qi-card qi-rules">
            <div className="qi-card-head">
              <div className="qi-card-title">
                <FileText size={16} />
                <span>Read the instructions</span>
              </div>
            </div>

            <ul className="qi-rules-list">
              {RULES.map((r) => (
                <li key={r.title} className="qi-rule">
                  <span className="qi-rule-icon">
                    <r.icon size={14} />
                  </span>
                  <div className="qi-rule-body">
                    <div className="qi-rule-title">{r.title}</div>
                    <div className="qi-rule-text">{r.body}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Footer agreement + start */}
        <div className="qi-footer">
          <label className="qi-agree">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span className="qi-check-box" aria-hidden>
              {agreed && <Check size={12} />}
            </span>
            <span className="qi-agree-text">
              I've read the instructions and understand that violating them may invalidate my attempt.
            </span>
          </label>

          <button
            type="button"
            className="btn btn-lime btn-lg qi-start-btn"
            onClick={handleStart}
            disabled={!canStart}
            title={
              !agreed
                ? "Tick the agreement to continue"
                : permState !== "granted"
                  ? "Allow camera & microphone access to continue"
                  : screenPermState !== "granted"
                    ? "Enable screen sharing to continue"
                    : "Begin the quiz"
            }
          >
            <Play size={16} />
            Begin quiz
            {attemptCost != null && (
              <span className="qi-start-cost">
                · {attemptCost === 0 ? "Free" : `${attemptCost} ${attemptCost === 1 ? "token" : "tokens"}`}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PermBadge({ state }) {
  if (state === "granted") {
    return (
      <span className="qi-perm-badge granted">
        <Check size={12} /> Ready
      </span>
    );
  }
  if (state === "denied") {
    return (
      <span className="qi-perm-badge denied">
        <AlertTriangle size={12} /> Blocked
      </span>
    );
  }
  if (state === "requesting") {
    return (
      <span className="qi-perm-badge pending">
        <Loader2 size={12} className="spin" /> Requesting
      </span>
    );
  }
  return (
    <span className="qi-perm-badge idle">
      <ShieldCheck size={12} /> Needs access
    </span>
  );
}
