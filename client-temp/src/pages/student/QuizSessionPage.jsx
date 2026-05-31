import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import {
  Clock, Flag, Check, ArrowLeft, ArrowRight, Send, Lock, AlertTriangle, Loader2,
  Camera, EyeOff,
} from "lucide-react";
import ThemeToggle from "../../components/ui/ThemeToggle";
import BrandLoader from "../../components/brand/BrandLoader";
import Modal from "../../components/ui/Modal";
import QuestionPalette from "../../components/student/QuestionPalette";
import ProctoringHud from "../../components/student/ProctoringHud";
import useProctoring from "../../hooks/useProctoring";
import {
  takeHandoffScreenStream,
  clearHandoffScreenStream,
} from "../../lib/proctoring/streamHandoff";
import { studentAPI } from "../../services/api";
import "./QuizSessionPage.css";

const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// True for question types that allow multiple selected options.
function isMultiSelect(type) {
  return type === "MSQ" || type === "MULTIPLE_CHOICE_MULTIPLE_ANSWERS";
}

// StrictMode-safe bootstrap: shares a single in-flight {startAttempt → getQuiz}
// promise per quizId across the dev-mode double-invocation, so the BE only
// sees ONE /start request and the UI never deadlocks on a "cancelled" closure.
const bootstrapCache = new Map();
function bootstrapQuiz(quizId) {
  let p = bootstrapCache.get(quizId);
  if (p) return p;
  p = (async () => {
    try {
      await studentAPI.startAttempt(quizId);
    } catch (err) {
      // 409 = already in progress (resume flow). Anything else propagates.
      if (err?.response?.status !== 409) throw err;
    }
    const res = await studentAPI.getQuiz(quizId);
    const quiz = res?.data?.quiz ?? res?.quiz ?? null;
    if (!quiz) throw new Error("Quiz not found");
    return quiz;
  })();
  // Drop the cache when the promise settles so a future re-entry (e.g. after
  // submitting and starting again) doesn't reuse stale state.
  p.finally(() => {
    // Defer one tick so a synchronous second StrictMode invocation still hits
    // the cached promise.
    setTimeout(() => bootstrapCache.delete(quizId), 0);
  });
  bootstrapCache.set(quizId, p);
  return p;
}

export default function QuizSessionPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // answers: { [questionId]: string[] }   (option IDs)
  const [answers, setAnswers] = useState({});
  const [flaggedIds, setFlaggedIds] = useState(new Set());
  const [currentQ, setCurrentQ] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  // Auto-submit explainer modal. Populated when proctoring's terminal
  // callback fires (strike limit reached or fullscreen exit). The modal
  // shows the reason for ~2.5s so the candidate can read it, then the
  // actual submit fires. Set to null when there's nothing to show.
  const [forceSubmitInfo, setForceSubmitInfo] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const startedAtRef = useRef(null);
  const totalTimeRef = useRef(0);
  const submittedRef = useRef(false);

  // Floating webcam preview (proctoring indicator).
  //   webcamRef       — ALWAYS-mounted off-screen <video>, owned by the
  //                     proctoring engine for detection. Never unmounts,
  //                     so hiding the preview tile doesn't blind the proctor.
  //   previewVideoRef — visible preview <video> that mounts/unmounts with
  //                     the floating tile. Decorative only.
  const webcamRef = useRef(null);
  const previewVideoRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const [webcamState, setWebcamState] = useState("idle"); // idle | live | denied
  const [webcamHidden, setWebcamHidden] = useState(false);

  // Screen-share — separate from the camera. The MediaStream was
  // acquired on the instructions page (getDisplayMedia needs a user
  // gesture every call, so we can't re-request here after navigation)
  // and handed off via the streamHandoff module. The session page is
  // responsible for cleaning it up when the attempt ends.
  const screenVideoRef = useRef(null);
  const screenStreamRef = useRef(null);
  const [screenState, setScreenState] = useState("idle"); // idle | live | missing

  // Track fullscreen state so we can prompt the user to re-enter — the
  // initial request happens during the user gesture on the instructions
  // page, but if they Esc out we need a click handler to re-enter (the
  // browser refuses requestFullscreen() outside a user gesture).
  const [isFullscreen, setIsFullscreen] = useState(
    typeof document !== "undefined" && !!document.fullscreenElement,
  );
  useEffect(() => {
    const sync = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    sync();
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const reEnterFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (!el.requestFullscreen) return;
    el.requestFullscreen().catch(() => { /* swallow — browser policy */ });
  }, []);

  // ── Bootstrap: start an attempt (or resume) + load the quiz ───────
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    bootstrapQuiz(quizId)
      .then((q) => {
        if (!active) return;
        setQuiz(q);
        const seconds = (q.timeLimitMins || 0) * 60;
        totalTimeRef.current = seconds;
        setTimeLeft(seconds);
        startedAtRef.current = Date.now();
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(
          err?.response?.data?.message ||
            err?.message ||
            "Couldn't start this quiz",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [quizId]);

  // ── Timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft == null) return undefined;
    if (timeLeft <= 0) return undefined;
    const id = setInterval(() => {
      setTimeLeft((prev) => (prev != null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  // Warn the user before reload / close — their attempt is in progress on BE.
  useEffect(() => {
    if (!quiz) return undefined;
    const onBeforeUnload = (e) => {
      if (submittedRef.current) return undefined;
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [quiz]);

  // Webcam proctoring stream — kicks in once the quiz loads. Browser
  // remembers the permission granted on the instructions page so this
  // re-request is silent.
  useEffect(() => {
    if (!quiz) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 240, height: 180 },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        webcamStreamRef.current = stream;
        // Bind the same stream to BOTH the always-on detection video
        // (used by the proctoring engine) and the preview tile if it's
        // currently mounted. A single MediaStream can drive multiple
        // <video> elements without extra GPU cost at 240×180.
        if (webcamRef.current) webcamRef.current.srcObject = stream;
        if (previewVideoRef.current) previewVideoRef.current.srcObject = stream;
        setWebcamState("live");
      } catch {
        if (!cancelled) setWebcamState("denied");
      }
    })();
    return () => {
      cancelled = true;
      const s = webcamStreamRef.current;
      if (s) {
        s.getTracks().forEach((t) => t.stop());
        webcamStreamRef.current = null;
      }
    };
  }, [quiz]);

  // Re-attach the stream to the preview <video> whenever the tile is
  // re-shown (it unmounts when hidden, so the ref resets to null).
  useEffect(() => {
    if (!webcamHidden && previewVideoRef.current && webcamStreamRef.current) {
      previewVideoRef.current.srcObject = webcamStreamRef.current;
    }
  }, [webcamHidden, webcamState]);

  // ── Screen-share handoff ─────────────────────────────────────────
  // Pull the MediaStream that was acquired on the instructions page.
  // If it's gone (page reload, direct nav, browser killed the stream),
  // we still let the quiz run but with camera-only evidence; force-
  // submit will trigger via SCREEN_SHARE_STOPPED below the first time
  // a screen capture is attempted with no stream attached.
  useEffect(() => {
    if (!quiz) return undefined;
    const stream = takeHandoffScreenStream();
    if (!stream) {
      setScreenState("missing");
      return undefined;
    }
    screenStreamRef.current = stream;
    if (screenVideoRef.current) screenVideoRef.current.srcObject = stream;
    setScreenState("live");
    // The browser's "Stop sharing" pill or the user closing the
    // shared monitor/window ends the track. We funnel that into the
    // proctoring engine as SCREEN_SHARE_STOPPED so it tips the
    // attempt into the auto-submit path.
    const track = stream.getVideoTracks()[0];
    const onEnded = () => {
      setScreenState("missing");
      // Route through the engine so the violation lands in the audit
      // trail and the same force-submit flow handles it.
      const e = proctoringEngineReportRef.current;
      if (e) e('SCREEN_SHARE_STOPPED');
    };
    track?.addEventListener('ended', onEnded);
    return () => {
      track?.removeEventListener('ended', onEnded);
      const s = screenStreamRef.current;
      if (s) {
        try { s.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
        screenStreamRef.current = null;
      }
      clearHandoffScreenStream();
    };
  }, [quiz]);

  // Captured separately so the screen-handoff effect (which runs once
  // per quiz mount) can poke the engine without depending on the
  // proctoring hook value (which would re-fire the effect every render).
  const proctoringEngineReportRef = useRef(null);

  // ── Proctoring engine ────────────────────────────────────────────
  // Wires face detection + tab-switch + fullscreen + blur + devtools
  // monitors through one rule book. Auto-submits with isProctoringFailure
  // when the strike counter hits the limit.
  const submitRef = useRef(null);
  const proctoring = useProctoring({
    enabled: !!quiz,
    quizId,
    // Single terminal path — fires for strike-limit reached AND for
    // fullscreen exit. We NEVER disqualify the candidate: the attempt
    // is submitted cleanly with whatever answers they have so far, the
    // failure flag stays off, and the score is computed normally. The
    // violations array still ships so an admin can see *why* the
    // attempt ended early on the audit timeline.
    onForceSubmit: ({ reason, violations, message }) => {
      if (!submitRef.current) return;
      const headline =
        reason === 'FULLSCREEN_EXIT'
          ? 'Full-screen exited'
          : 'Proctoring limit reached';
      const body =
        message ||
        (reason === 'FULLSCREEN_EXIT'
          ? 'You exited full-screen, which ends the attempt early. We are submitting the answers you have right now.'
          : 'The proctoring strike limit was reached. We are submitting the answers you have right now.');
      // Show the modal first so the candidate sees WHY this is happening,
      // then submit after a short read-time. The actual submit call still
      // runs asynchronously; the modal stays mounted until the page
      // navigates to the result screen.
      setForceSubmitInfo({ reason, headline, body });
      const payload = {
        isProctoringFailure: false,
        proctoringViolations: (violations || []).map((v) => ({
          type: v.type,
          timestamp: v.timestamp || new Date().toISOString(),
          details: v.message || v.type,
        })),
      };
      setTimeout(() => {
        if (submitRef.current) submitRef.current(payload);
      }, 3000);
    },
  });

  // Attach the live webcam stream/video to the engine once both exist,
  // then kick the monitors off. We depend on `proctoring.controls` (a
  // memoized handle) rather than the whole `proctoring` object — the
  // full object is a fresh reference on every render, which would re-
  // fire this effect every tick and shoot an extra heartbeat frame per
  // start() call.
  const proctorControls = proctoring.controls;

  // Keep the screen-handoff effect's ref pointing at the current
  // engine.report — that effect runs once per quiz mount but the
  // engine identity is stable, so this assignment is effectively
  // "wire it once."
  useEffect(() => {
    proctoringEngineReportRef.current = proctorControls.report;
    return () => { proctoringEngineReportRef.current = null; };
  }, [proctorControls]);

  useEffect(() => {
    if (!quiz || webcamState !== "live") return;
    proctorControls.attachVideo(webcamRef.current);
    proctorControls.attachStream(webcamStreamRef.current);
    // Screen attach — safe to call with null refs; collector will just
    // skip SCREEN captures until both are populated.
    proctorControls.attachScreenVideo(screenVideoRef.current);
    proctorControls.attachScreenStream(screenStreamRef.current);
    proctorControls.start();
    return () => proctorControls.stop();
  }, [quiz, webcamState, screenState, proctorControls]);

  // Request fullscreen as soon as the quiz mounts. We can't force it from
  // JS without a user gesture in some browsers — Begin Quiz on the
  // instructions page IS that gesture, but we re-request here in case the
  // browser dropped the original request during the page navigation.
  useEffect(() => {
    if (!quiz) return;
    if (document.fullscreenElement) return;
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => { /* user can re-enter manually via the warning */ });
    }
  }, [quiz]);

  // ── Derived state ─────────────────────────────────────────────────
  const questions = quiz?.questions || [];
  const totalQ = questions.length;
  const rankRewarding = !!quiz?.rankRewarding;
  const currentRow = questions[currentQ];
  const currentData = currentRow?.questionData;
  const currentId = currentRow?.questionId;
  const isMulti = isMultiSelect(currentData?.questionType);

  // ── Per-question timing ──────────────────────────────────────────
  // Records seconds spent on each question. We accumulate into a ref
  // (mutating refs doesn't trigger re-renders, which is fine for timing
  // book-keeping) and flush whenever the current question changes.
  const timePerQuestionRef = useRef({}); // { [questionId]: seconds }
  const questionEnterAtRef = useRef(null);
  const lastQuestionIdRef = useRef(null);

  // Flush time spent on the previous question whenever the current one changes
  // (and on the initial mount, prime the timer for the first question).
  useEffect(() => {
    const now = Date.now();
    const prevId = lastQuestionIdRef.current;
    if (prevId && questionEnterAtRef.current != null) {
      const delta = Math.round((now - questionEnterAtRef.current) / 1000);
      if (delta > 0) {
        timePerQuestionRef.current[prevId] =
          (timePerQuestionRef.current[prevId] || 0) + delta;
      }
    }
    lastQuestionIdRef.current = currentId || null;
    questionEnterAtRef.current = currentId ? now : null;
  }, [currentId]);

  const answeredSet = useMemo(() => {
    const s = new Set();
    questions.forEach((row, idx) => {
      const a = answers[row.questionId];
      if (a && a.length > 0) s.add(idx);
    });
    return s;
  }, [answers, questions]);

  const flaggedSet = useMemo(() => {
    const s = new Set();
    questions.forEach((row, idx) => {
      if (flaggedIds.has(row.questionId)) s.add(idx);
    });
    return s;
  }, [flaggedIds, questions]);

  // ── Handlers ───────────────────────────────────────────────────────
  const selectOption = useCallback((optionId) => {
    if (!currentId) return;
    setAnswers((prev) => {
      const existing = prev[currentId] || [];
      if (isMulti) {
        const next = existing.includes(optionId)
          ? existing.filter((x) => x !== optionId)
          : [...existing, optionId];
        return { ...prev, [currentId]: next };
      }
      return { ...prev, [currentId]: [optionId] };
    });
  }, [currentId, isMulti]);

  const toggleFlag = useCallback(() => {
    if (!currentId) return;
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(currentId)) next.delete(currentId);
      else next.add(currentId);
      return next;
    });
  }, [currentId]);

  const goNext = useCallback(() => {
    setCurrentQ((p) => (p < totalQ - 1 ? p + 1 : p));
  }, [totalQ]);

  const goPrev = useCallback(() => {
    if (rankRewarding) return;
    setCurrentQ((p) => (p > 0 ? p - 1 : p));
  }, [rankRewarding]);

  const handlePaletteNavigate = useCallback((idx) => {
    if (rankRewarding && idx < currentQ) return;
    setCurrentQ(idx);
  }, [rankRewarding, currentQ]);

  const submit = useCallback(async (opts = {}) => {
    const { isProctoringFailure = false, proctoringViolations = [] } = opts;
    if (submitting || submittedRef.current) return;
    setSubmitting(true);

    // Flush the time spent on the question that's currently on-screen
    // before we package the timings into the submit payload.
    const now = Date.now();
    if (lastQuestionIdRef.current && questionEnterAtRef.current != null) {
      const delta = Math.round((now - questionEnterAtRef.current) / 1000);
      if (delta > 0) {
        const id = lastQuestionIdRef.current;
        timePerQuestionRef.current[id] =
          (timePerQuestionRef.current[id] || 0) + delta;
      }
      questionEnterAtRef.current = null;
    }

    const elapsed = startedAtRef.current
      ? Math.max(0, Math.round((now - startedAtRef.current) / 1000))
      : undefined;
    const payload = {
      answers: questions.map((row) => ({
        questionId: row.questionId,
        selectedAnswers: answers[row.questionId] || [],
        timeTakenSecs: timePerQuestionRef.current[row.questionId] || 0,
      })),
      timeTakenSecs: elapsed,
      isProctoringFailure,
      proctoringViolations,
    };
    try {
      // Snapshot a final "exit" frame before we stop the camera. Caught
      // by the BE as kind=EXIT and surfaces as the closing photo on the
      // attempt timeline. Best-effort — failures don't block submit.
      if (!isProctoringFailure) {
        try { await proctoring.captureExit(); } catch { /* ignore */ }
      }
      // Drop fullscreen before navigating away so the result page isn't stuck.
      if (document.fullscreenElement) {
        try { await document.exitFullscreen(); } catch { /* ignore */ }
      }
      const res = await studentAPI.submitAttempt(quizId, payload);
      submittedRef.current = true;
      const data = res?.data ?? res ?? null;
      navigate(`/app/quizzes/${quizId}/result`, {
        state: { result: data, quiz: { id: quizId, title: quiz?.title, subject: quiz?.subject } },
        replace: true,
      });
    } catch (err) {
      setSubmitting(false);
      setShowSubmitModal(false);
      setLoadError(err?.response?.data?.message || err?.message || "Couldn't submit your attempt");
    }
  }, [submitting, questions, answers, quizId, navigate, quiz, proctoring]);

  // Expose the latest submit() to the proctoring onDisqualify callback
  // (which was created above with a forward-reference ref).
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  // Auto-submit when timer hits 0. Bypasses the submit modal — time's up
  // means the attempt is locked regardless of what the student has answered.
  const autoSubmitFiredRef = useRef(false);
  useEffect(() => {
    if (timeLeft === 0 && quiz && !submittedRef.current && !autoSubmitFiredRef.current) {
      autoSubmitFiredRef.current = true;
      setShowSubmitModal(false);
      submit();
    }
  }, [timeLeft, quiz, submit]);

  // ── Render: loading + error ────────────────────────────────────────
  if (loading) {
    return <BrandLoader />;
  }
  if (loadError || !quiz) {
    return (
      <div style={{ background: "var(--rr-bg-alt)", minHeight: "100vh", padding: "80px 24px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", background: "var(--rr-bg)", border: "1px solid var(--rr-border)", borderRadius: 12, padding: 28, textAlign: "center" }}>
          <AlertTriangle size={28} style={{ color: "var(--rr-coral-500)", marginBottom: 12 }} />
          <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>Can't open this quiz</h2>
          <p style={{ color: "var(--rr-fg-dim)", fontSize: 13, marginBottom: 20 }}>
            {loadError || "Quiz unavailable."}
          </p>
          <Link to="/app/quizzes" className="btn btn-secondary">
            <ArrowLeft size={14} />
            Back to quizzes
          </Link>
        </div>
      </div>
    );
  }

  // ── Render: session ────────────────────────────────────────────────
  const totalTime = totalTimeRef.current;
  const progressPct = totalQ ? ((currentQ + 0.5) / totalQ) * 100 : 0;
  const elapsed = Math.max(0, totalTime - (timeLeft ?? 0));
  const timerClass =
    timeLeft != null && timeLeft <= 60
      ? "qs-timer danger"
      : timeLeft != null && timeLeft <= 180
        ? "qs-timer warn"
        : "qs-timer";

  const headLabel = [quiz.subject, quiz.chapter || quiz.topic, quiz.difficulty]
    .filter(Boolean)
    .join(" · ");

  const selectedForCurrent = currentId ? answers[currentId] || [] : [];

  // Live face state from the proctoring engine — drives the alignment pill
  // shown next to the webcam tile.
  const faceState = proctoring.faceState || "idle";
  const faceLabel = {
    ok: "Aligned · face clearly visible",
    partial: "Re-center · move closer or face the camera",
    missing: "Face not detected — return to frame",
    multi: "More than one person detected",
    idle: "Detecting…",
  }[faceState];
  const faceTone = {
    ok: "ok",
    partial: "warn",
    missing: "bad",
    multi: "bad",
    idle: "idle",
  }[faceState];

  return (
    <div style={{ background: "var(--rr-bg-alt)", minHeight: "100vh" }}>
      {/* Fullscreen re-entry banner — visible only when the browser
          dropped fullscreen (Esc or alt-tab). requestFullscreen() needs
          a user gesture, so the user must click. */}
      {!isFullscreen && (
        <div
          role="alert"
          style={{
            position: "sticky", top: 0, zIndex: 60,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            padding: "10px 14px",
            background: "color-mix(in oklab, #E5484D 16%, var(--rr-surface))",
            borderBottom: "1px solid color-mix(in oklab, #E5484D 40%, var(--rr-border))",
            color: "var(--rr-fg)", fontSize: 13, fontWeight: 500,
          }}
        >
          <AlertTriangle size={16} style={{ color: "#E5484D" }} />
          <span>
            <b>Full-screen required.</b> If you exit, your attempt will be auto-submitted with the answers you have so far — click below to stay in full-screen.
          </span>
          <button
            type="button"
            onClick={reEnterFullscreen}
            style={{
              background: "var(--rr-violet-500)", color: "white",
              border: 0, borderRadius: 999, padding: "6px 14px",
              fontWeight: 600, cursor: "pointer", fontSize: 12,
            }}
          >
            Re-enter full-screen
          </button>
        </div>
      )}

      {/* Top bar */}
      <header className="qs-top">
        <div className="qs-left">
          <div className="rr-mark" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 14L12 7L19 14" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 19L12 12L19 19" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
            </svg>
          </div>
          <div className="qs-title">
            <span className="label">
              {headLabel || "Quiz"}
              {rankRewarding && <span className="qs-rank-tag">· Rank-rewarding</span>}
            </span>
            <span className="name">{quiz.title}</span>
          </div>
        </div>

        <div className="qs-center">
          <div className={timerClass}>
            <Clock size={16} />
            <span className="time">{formatTime(Math.max(0, timeLeft ?? 0))}</span>
            <span className="max">/ {formatTime(totalTime)}</span>
          </div>
          <ProctoringHud
            status={proctoring.status}
            strikes={proctoring.strikes}
            limit={proctoring.limit}
            warning={proctoring.warning}
          />
        </div>

        <div className="qs-right">
          <ThemeToggle />
          <button
            className="btn btn-accent"
            onClick={() => setShowSubmitModal(true)}
            disabled={submitting}
          >
            <Send size={16} />
            Submit
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="qs-progress">
        <div className="qs-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Question area */}
      <div className="session-shell">
        <div className="q-head">
          <span className="qn">
            Question <b>{String(currentQ + 1).padStart(2, "0")}</b> of {totalQ}
            {currentData?.estimatedTimeSeconds ? ` · ${currentData.estimatedTimeSeconds} sec target` : ""}
          </span>
          <div className="actions">
            <button
              className={`flag-btn${currentId && flaggedIds.has(currentId) ? " on" : ""}`}
              onClick={toggleFlag}
            >
              <Flag size={14} />
              {currentId && flaggedIds.has(currentId) ? "Flagged" : "Flag for review"}
            </button>
          </div>
        </div>

        <div className="q-card">
          {currentData?.topic && <div className="q-topic">{currentData.topic}</div>}
          {currentData?.question && (
            <p className="q-text" style={{ whiteSpace: "pre-wrap" }}>{currentData.question}</p>
          )}
          {currentData?.questionImageUrl && (
            <div className="q-image">
              <img src={currentData.questionImageUrl} alt="" />
            </div>
          )}

          <div className="q-options">
            {(currentData?.options || []).map((opt, idx) => {
              const selected = selectedForCurrent.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  className={`q-option${selected ? " selected" : ""}`}
                  onClick={() => selectOption(opt.id)}
                  type="button"
                >
                  <span className="key">{OPTION_KEYS[idx] || idx + 1}</span>
                  <span className="text">{opt.text}</span>
                  <span className="check">
                    <Check size={14} className="check-icon" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky footer with palette */}
      <footer className="qs-footer">
        <div className="qs-footer-inner">
          <QuestionPalette
            total={totalQ}
            current={currentQ}
            answered={answeredSet}
            flagged={flaggedSet}
            onNavigate={handlePaletteNavigate}
            lockBack={rankRewarding}
          />
          <div className="qs-nav">
            {!rankRewarding ? (
              <button
                className="btn btn-secondary"
                onClick={goPrev}
                disabled={currentQ === 0}
              >
                <ArrowLeft size={16} />
                Previous
              </button>
            ) : (
              <span className="qs-locked-back" title="Rank-rewarding quiz — no going back">
                <Lock size={14} />
                No backtracking
              </span>
            )}
            {currentQ === totalQ - 1 ? (
              <button
                className="btn btn-accent"
                onClick={() => setShowSubmitModal(true)}
                disabled={submitting}
              >
                <Send size={16} />
                Submit
              </button>
            ) : (
              <button className="btn btn-accent" onClick={goNext}>
                Next
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Submit confirmation modal */}
      <Modal
        open={showSubmitModal}
        onClose={submitting ? undefined : () => setShowSubmitModal(false)}
        title="Submit quiz?"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setShowSubmitModal(false)}
              disabled={submitting}
            >
              Keep going
            </button>
            <button className="btn btn-accent" onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
              {submitting ? "Submitting…" : "Submit now"}
            </button>
          </>
        }
      >
        <p style={{ color: "var(--rr-fg-2)", fontSize: 14, margin: "0 0 12px" }}>
          Once you submit, your answers are final and will be graded immediately.
        </p>

        {flaggedIds.size > 0 && (
          <div className="qs-flag-warn">
            <Flag size={14} />
            <div>
              <strong>{flaggedIds.size} flagged question{flaggedIds.size === 1 ? "" : "s"}</strong> need review.
              {!rankRewarding && " Jump back to revisit before submitting."}
              {rankRewarding && " Review your selection — you can't return to them."}
            </div>
          </div>
        )}

        {totalQ - answeredSet.size > 0 && (
          <div className="qs-unanswered-warn">
            <AlertTriangle size={14} />
            <div>
              <strong>{totalQ - answeredSet.size} unanswered</strong> · they'll be marked as skipped.
            </div>
          </div>
        )}

        <div className="submit-modal-stats">
          <div className="stat">
            <span className="n">{answeredSet.size}</span>
            <span className="l">Answered</span>
          </div>
          <div className="stat">
            <span className="n" style={{ color: "var(--rr-amber-500)" }}>{flaggedIds.size}</span>
            <span className="l">Flagged</span>
          </div>
          <div className="stat">
            <span className="n" style={{ color: "var(--rr-fg-muted)" }}>
              {totalQ - answeredSet.size}
            </span>
            <span className="l">Unanswered</span>
          </div>
          <div className="stat">
            <span className="n">{formatTime(elapsed)}</span>
            <span className="l">Time used</span>
          </div>
        </div>
      </Modal>

      {/* Auto-submit explainer modal. Mounts the moment the proctoring
          engine fires onForceSubmit; not dismissible — the actual submit
          runs 2.5s after this mounts so the candidate has time to read
          the reason. Modal stays mounted until the page navigates to the
          result screen. */}
      <Modal
        open={!!forceSubmitInfo}
        onClose={() => { /* no-op — submission is in progress */ }}
        title={forceSubmitInfo?.headline || "Auto-submitting your attempt"}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "8px 4px 4px" }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "color-mix(in oklab, #E5484D 18%, var(--rr-surface))",
              border: "1px solid color-mix(in oklab, #E5484D 40%, var(--rr-border))",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#E5484D",
            }}
          >
            <AlertTriangle size={26} />
          </div>
          <p style={{ margin: 0, textAlign: "center", color: "var(--rr-fg)", fontSize: 14, lineHeight: 1.55, maxWidth: 380 }}>
            {forceSubmitInfo?.body}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--rr-fg-muted)", fontSize: 12, fontWeight: 500 }}>
            <Loader2 size={14} className="spin" />
            <span>Submitting your answers now — please don't close this tab…</span>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "var(--rr-fg-dim)", textAlign: "center", maxWidth: 380 }}>
            Your answers still count. You'll be taken to your result page in a moment.
          </p>
        </div>
      </Modal>

      {/* Always-mounted off-screen detection video. The proctoring
          engine attaches to this ref, so hiding the visible tile
          (below) doesn't kill face detection.

          DELIBERATE SIZE: 240×180 (the getUserMedia source resolution),
          NOT 1×1 or opacity:0. Chrome throttles or stops frame
          decoding for video elements that are effectively invisible
          — including opacity:0 and tiny sizes — which silently breaks
          drawImage/JPEG capture even though `readyState` reports 2+.
          A real-sized off-screen element keeps the normal decode
          pipeline active. */}
      <video
        ref={webcamRef}
        autoPlay
        playsInline
        muted
        aria-hidden
        tabIndex={-1}
        style={{
          position: "fixed",
          left: -3000,
          top: 0,
          width: 240,
          height: 180,
          pointerEvents: "none",
        }}
      />

      {/* Always-mounted off-screen SCREEN-share video. Decoded
          continuously so the proctoring evidence pipeline can pull
          1280×720 frames into a canvas on every heartbeat / burst. We
          render it at a real (but invisible-to-the-user) size for the
          same reason as the webcam — browsers throttle decoding on
          opacity:0 / 1×1 media elements. */}
      <video
        ref={screenVideoRef}
        autoPlay
        playsInline
        muted
        aria-hidden
        tabIndex={-1}
        style={{
          position: "fixed",
          left: -4000,
          top: 0,
          width: 320,
          height: 180,
          pointerEvents: "none",
        }}
      />

      {/* Floating webcam tile — visible preview only. */}
      {webcamHidden ? (
        <button
          type="button"
          className={`qs-webcam-pill ${webcamState === "live" ? "live" : webcamState === "denied" ? "denied" : "idle"}`}
          onClick={() => setWebcamHidden(false)}
          title="Show camera preview"
        >
          <span className={`qs-webcam-dot ${webcamState === "live" ? "on" : "off"}`} />
          <Camera size={14} />
          <span className="qs-webcam-pill-label">
            {webcamState === "live" ? "Show camera" : webcamState === "denied" ? "Camera blocked" : "Camera idle"}
          </span>
        </button>
      ) : (
        <div className={`qs-webcam${webcamState === "denied" ? " denied" : ""}`}>
          <div className="qs-webcam-frame">
            <video
              ref={previewVideoRef}
              autoPlay
              playsInline
              muted
              className="qs-webcam-video"
            />
            {webcamState !== "live" && (
              <div className="qs-webcam-empty">
                {webcamState === "denied" ? (
                  <>
                    <AlertTriangle size={16} />
                    <span>Camera blocked</span>
                  </>
                ) : (
                  <>
                    <Camera size={16} />
                    <span>Starting…</span>
                  </>
                )}
              </div>
            )}
            <span className={`qs-webcam-dot ${webcamState === "live" ? "on" : "off"}`} />
          </div>
          {webcamState === "live" && (
            <div
              className={`qs-webcam-align qs-webcam-align-${faceTone}`}
              role="status"
              title={faceLabel}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 10px",
                fontSize: 11, fontWeight: 600,
                background:
                  faceTone === "ok" ? "color-mix(in oklab, #5BD06A 18%, transparent)" :
                  faceTone === "warn" ? "color-mix(in oklab, #E8A53C 22%, transparent)" :
                  faceTone === "bad" ? "color-mix(in oklab, #E5484D 22%, transparent)" :
                  "color-mix(in oklab, var(--rr-fg-dim) 20%, transparent)",
                color:
                  faceTone === "ok" ? "#3CB553" :
                  faceTone === "warn" ? "#E8A53C" :
                  faceTone === "bad" ? "#E5484D" :
                  "var(--rr-fg-muted)",
                borderTop: "1px solid var(--rr-border)",
              }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "currentColor", flexShrink: 0,
                boxShadow: faceTone === "ok" ? "0 0 6px currentColor" : "none",
              }} />
              <span style={{
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{faceLabel}</span>
            </div>
          )}
          <div className="qs-webcam-foot">
            <span className="qs-webcam-label">
              {webcamState === "live" ? "Recording" : webcamState === "denied" ? "Blocked" : "Idle"}
            </span>
            <button
              type="button"
              className="qs-webcam-hide"
              onClick={() => setWebcamHidden(true)}
              title="Minimize"
            >
              <EyeOff size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
