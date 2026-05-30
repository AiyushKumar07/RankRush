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
  const [timeLeft, setTimeLeft] = useState(null);

  const startedAtRef = useRef(null);
  const totalTimeRef = useRef(0);
  const submittedRef = useRef(false);

  // Floating webcam preview (proctoring indicator).
  const webcamRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const [webcamState, setWebcamState] = useState("idle"); // idle | live | denied
  const [webcamHidden, setWebcamHidden] = useState(false);

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
        if (webcamRef.current) webcamRef.current.srcObject = stream;
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

  // Reattach stream if the user toggles the webcam tile visibility.
  useEffect(() => {
    if (!webcamHidden && webcamRef.current && webcamStreamRef.current) {
      webcamRef.current.srcObject = webcamStreamRef.current;
    }
  }, [webcamHidden, webcamState]);

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

  const submit = useCallback(async () => {
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
    };
    try {
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
  }, [submitting, questions, answers, quizId, navigate, quiz]);

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

  return (
    <div style={{ background: "var(--rr-bg-alt)", minHeight: "100vh" }}>
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

      {/* Floating webcam tile — proctoring indicator */}
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
              ref={webcamRef}
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
