import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Clock, Flag, Check, ArrowLeft, ArrowRight, Send,
} from "lucide-react";
import RRBrand from "../../components/brand/RRBrand";
import ThemeToggle from "../../components/ui/ThemeToggle";
import Modal from "../../components/ui/Modal";
import QuestionPalette from "../../components/student/QuestionPalette";
import "./QuizSessionPage.css";

const QUESTIONS = [
  {
    topic: "Limits · Direct substitution",
    text: "Evaluate the following limit: lim(x→2) (x² − 4) / (x − 2)",
    formula: null,
    options: ["4", "2", "0", "Does not exist"],
    correct: 0,
  },
  {
    topic: "Continuity · Definition checks",
    text: "If f(x) = (x² − 1) / (x − 1), is f continuous at x = 1?",
    formula: null,
    options: [
      "Yes, f is continuous at x = 1",
      "No, f has a removable discontinuity at x = 1",
      "No, f has a jump discontinuity at x = 1",
      "f is undefined at x = 1",
    ],
    correct: 1,
  },
  {
    topic: "Limits · L'Hôpital's rule",
    text: "Evaluate the following limit using L'Hôpital's rule, given that direct substitution yields the 0/0 indeterminate form:",
    formula: "lim(x→0)  (sin 3x − 3x) / x³",
    options: ["−1/2", "−9/2", "9/2", "0"],
    correct: 0,
  },
  {
    topic: "Limits · Infinity",
    text: "Find lim(x→∞) (3x² + 5) / (2x² − 7)",
    formula: null,
    options: ["3/2", "0", "∞", "5/7"],
    correct: 0,
  },
  {
    topic: "Continuity · Absolute value",
    text: "Determine continuity of f(x) = |x| at x = 0",
    formula: null,
    options: [
      "Continuous",
      "Discontinuous — left limit ≠ right limit",
      "Discontinuous — not defined at x = 0",
      "Discontinuous — limit ≠ f(0)",
    ],
    correct: 0,
  },
  {
    topic: "Limits · Standard limits",
    text: "Evaluate lim(x→0) (1 − cos x) / x²",
    formula: null,
    options: ["1/2", "1", "0", "Does not exist"],
    correct: 0,
  },
  {
    topic: "Limits · Theory",
    text: "If lim(x→a) f(x) = L, is f(a) = L necessarily true?",
    formula: null,
    options: [
      "No — the limit and function value are independent",
      "Yes — by definition of limit",
      "Only if f is polynomial",
      "Only if f is differentiable at a",
    ],
    correct: 0,
  },
  {
    topic: "Limits · One-sided",
    text: "Find the left-hand limit of f(x) = ⌊x⌋ at x = 2",
    formula: null,
    options: ["1", "2", "0", "Does not exist"],
    correct: 0,
  },
  {
    topic: "Limits · L'Hôpital's rule",
    text: "Apply L'Hôpital twice: lim(x→0) (eˣ − 1 − x) / x²",
    formula: null,
    options: ["1/2", "1", "0", "e"],
    correct: 0,
  },
  {
    topic: "Continuity · Piecewise",
    text: "For what value of k is f continuous at x = 3? f(x) = (x² − 9) / (x − 3) for x ≠ 3, k for x = 3",
    formula: null,
    options: ["6", "3", "9", "0"],
    correct: 0,
  },
  { topic: "Limits · Squeeze theorem", text: "Squeeze theorem on x² sin(1/x) as x → 0", formula: null, options: ["0", "1", "−1", "DNE"], correct: 0 },
  { topic: "Limits · Standard", text: "Find lim(x→0) tan(x) / x", formula: null, options: ["1", "0", "∞", "−1"], correct: 0 },
  { topic: "Continuity · Piecewise", text: "Continuity of piecewise function with two cases", formula: null, options: ["Continuous everywhere", "Discontinuous at x = 1", "Discontinuous at x = 0", "Depends on the constant"], correct: 3 },
  { topic: "Limits · Special", text: "lim(x→∞) (1 + 1/x)ˣ", formula: null, options: ["e", "1", "∞", "0"], correct: 0 },
  { topic: "Continuity · Types", text: "Removable discontinuity vs jump discontinuity", formula: null, options: ["Removable: limit exists but ≠ f(a)", "Jump: left limit ≠ right limit", "Both A and B", "Neither"], correct: 2 },
  { topic: "Continuity · IVT", text: "Intermediate Value Theorem application", formula: null, options: ["Root exists in [a,b]", "f is differentiable", "f has a maximum", "f is bounded"], correct: 0 },
  { topic: "Limits · Rationalization", text: "lim(x→0) (√(1+x) − 1) / x using rationalization", formula: null, options: ["1/2", "1", "0", "2"], correct: 0 },
  { topic: "Continuity · Endpoints", text: "Continuity at endpoint of closed interval", formula: null, options: ["Only one-sided limit needed", "Both limits needed", "Not possible", "Always continuous"], correct: 0 },
  { topic: "Limits · L'Hôpital", text: "lim(x→∞) (ln x) / x", formula: null, options: ["0", "1", "∞", "−∞"], correct: 0 },
  { topic: "Limits · Two-sided", text: "Two-sided limit existence with absolute value", formula: null, options: ["Exists and equals 1", "Exists and equals −1", "Does not exist", "Equals 0"], correct: 0 },
];

const TOTAL_TIME = 12 * 60; // 12 minutes in seconds
const OPTION_KEYS = ["A", "B", "C", "D"];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function QuizSessionPage() {
  const navigate = useNavigate();
  const totalQ = QUESTIONS.length;

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (timeLeft === 0) {
      navigate("/app/quizzes/featured/result");
    }
  }, [timeLeft, navigate]);

  const answeredSet = useMemo(
    () => new Set(Object.keys(answers).map(Number)),
    [answers]
  );

  const selectOption = useCallback(
    (optIdx) => {
      setAnswers((prev) => ({ ...prev, [currentQ]: optIdx }));
    },
    [currentQ]
  );

  const toggleFlag = useCallback(() => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentQ)) next.delete(currentQ);
      else next.add(currentQ);
      return next;
    });
  }, [currentQ]);

  const goNext = useCallback(() => {
    if (currentQ < totalQ - 1) setCurrentQ((p) => p + 1);
  }, [currentQ, totalQ]);

  const goPrev = useCallback(() => {
    if (currentQ > 0) setCurrentQ((p) => p - 1);
  }, [currentQ]);

  const handleSubmit = useCallback(() => {
    setShowSubmitModal(false);
    navigate("/app/quizzes/featured/result");
  }, [navigate]);

  const question = QUESTIONS[currentQ];
  const progressPct = ((currentQ + 0.5) / totalQ) * 100;
  const elapsed = TOTAL_TIME - timeLeft;
  const timerClass =
    timeLeft <= 60 ? "qs-timer danger" : timeLeft <= 180 ? "qs-timer warn" : "qs-timer";

  return (
    <div style={{ background: "var(--rr-bg-alt)", minHeight: "100vh" }}>
      {/* Top bar */}
      <header className="qs-top">
        <div className="qs-left">
          <Link to="/app/quizzes">
            <div className="rr-mark">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 14L12 7L19 14" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 19L12 12L19 19" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
              </svg>
            </div>
          </Link>
          <div className="qs-title">
            <span className="label">Calculus · Chapter 5 · Hard</span>
            <span className="name">
              Limits &amp; continuity — your weak-spot mop-up
            </span>
          </div>
        </div>

        <div className="qs-center">
          <div className={timerClass}>
            <Clock size={16} />
            <span className="time">{formatTime(timeLeft)}</span>
            <span className="max">/ {formatTime(TOTAL_TIME)}</span>
          </div>
        </div>

        <div className="qs-right">
          <ThemeToggle />
          <button
            className="btn btn-accent"
            onClick={() => setShowSubmitModal(true)}
          >
            <Send size={16} />
            Submit
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="qs-progress">
        <div
          className="qs-progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Question area */}
      <div className="session-shell">
        <div className="q-head">
          <span className="qn">
            Question <b>{String(currentQ + 1).padStart(2, "0")}</b> of{" "}
            {totalQ} · 60 sec target
          </span>
          <div className="actions">
            <button
              className={`flag-btn${flagged.has(currentQ) ? " on" : ""}`}
              onClick={toggleFlag}
            >
              <Flag size={14} />
              {flagged.has(currentQ) ? "Flagged" : "Flag for review"}
            </button>
          </div>
        </div>

        <div className="q-card">
          <div className="q-topic">{question.topic}</div>
          <p className="q-text">{question.text}</p>
          {question.formula && (
            <div className="q-formula">
              <em>{question.formula}</em>
            </div>
          )}

          <div className="q-options">
            {question.options.map((opt, idx) => (
              <button
                key={idx}
                className={`q-option${answers[currentQ] === idx ? " selected" : ""}`}
                onClick={() => selectOption(idx)}
              >
                <span className="key">{OPTION_KEYS[idx]}</span>
                <span className="text">{opt}</span>
                <span className="check">
                  <Check size={14} className="check-icon" />
                </span>
              </button>
            ))}
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
            flagged={flagged}
            onNavigate={setCurrentQ}
          />
          <div className="qs-nav">
            <button
              className="btn btn-secondary"
              onClick={goPrev}
              disabled={currentQ === 0}
            >
              <ArrowLeft size={16} />
              Previous
            </button>
            <button
              className="btn btn-accent"
              onClick={goNext}
              disabled={currentQ === totalQ - 1}
            >
              Next
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </footer>

      {/* Submit confirmation modal */}
      <Modal
        open={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit quiz?"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setShowSubmitModal(false)}
            >
              Keep going
            </button>
            <button className="btn btn-accent" onClick={handleSubmit}>
              <Send size={14} />
              Submit now
            </button>
          </>
        }
      >
        <p style={{ color: "var(--rr-fg-2)", fontSize: 14, margin: "0 0 8px" }}>
          Once you submit, your answers are final and will be graded
          immediately.
        </p>
        <div className="submit-modal-stats">
          <div className="stat">
            <span className="n">{answeredSet.size}</span>
            <span className="l">Answered</span>
          </div>
          <div className="stat">
            <span className="n" style={{ color: "var(--rr-amber-500)" }}>
              {flagged.size}
            </span>
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
    </div>
  );
}
