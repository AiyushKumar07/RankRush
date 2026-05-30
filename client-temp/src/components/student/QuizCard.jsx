import { Link } from "react-router-dom";
import {
  Clock, CircleCheck, Users, ArrowRight, Lock, Crown,
  Bookmark, BookmarkCheck,
} from "lucide-react";

const SUBJ_COLORS = {
  math: "var(--rr-violet-500)",
  physics: "var(--rr-cyan-500)",
  chem: "var(--rr-amber-500)",
  bio: "var(--rr-emerald-500)",
  mixed: null,
};

/**
 * @param {Object} props
 * @param {'math'|'physics'|'chem'|'bio'|'mixed'} props.subject
 * @param {string} props.topic        - e.g. "Calculus · Differentiation"
 * @param {string} props.title
 * @param {number} props.questionCount
 * @param {string} props.duration      - e.g. "15 min"
 * @param {string} props.attempts      - e.g. "1.2k attempts"
 * @param {number} props.difficulty    - 1–5
 * @param {'new'|'progress'|'done'} props.status
 * @param {number} [props.progress]    - 0–100 (only for status='progress')
 * @param {number|string} props.cost   - token cost, or "+1 earned" for done
 * @param {string} [props.statusText]  - e.g. "↻ In progress · 12 / 20"
 * @param {string} [props.subjectLabel]- e.g. "Mathematics"
 * @param {string} [props.quizId]      - for linking
 * @param {boolean}[props.locked]      - low-token state
 */
export default function QuizCard({
  subject = "math",
  topic,
  title,
  questionCount,
  duration,
  attempts,
  difficulty = 3,
  status = "new",
  progress,
  cost = 1,
  statusText,
  subjectLabel,
  quizId = "1",
  locked = false,
  lockMessage,
  saved = false,
  onToggleSave,
  saving = false,
}) {
  const isLocked = locked || !!lockMessage;
  const isDone = status === "done";
  const isProgress = status === "progress";

  const defaultStatusText = isDone
    ? `✓ Completed`
    : isProgress
      ? `↻ In progress`
      : "New";

  const displayLabel =
    subjectLabel ||
    {
      math: "Mathematics",
      physics: "Physics",
      chem: "Chemistry",
      bio: "Biology",
      mixed: "Mixed · PCM",
    }[subject] ||
    subject;

  return (
    <article
      className={`quiz-card${isLocked ? " locked" : ""}`}
      data-subj={subject}
      title={lockMessage || undefined}
    >
      <div className="band" />
      {lockMessage && (
        <span className="quiz-lock-chip" title={lockMessage}>
          <Crown size={11} />Pro
        </span>
      )}
      {onToggleSave && !lockMessage && (
        <button
          type="button"
          className={`quiz-save-btn${saved ? " on" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!saving) onToggleSave();
          }}
          disabled={saving}
          aria-label={saved ? "Remove from saved" : "Save quiz"}
          title={saved ? "Saved" : "Save for later"}
        >
          {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
        </button>
      )}
      <div className="body">
        <div className="top">
          <span className="subj-badge">
            <span className="d" />
            {displayLabel}
          </span>
          <span
            className={`status${isDone ? " done" : isProgress ? " progress" : ""}`}
          >
            {statusText || defaultStatusText}
          </span>
        </div>
        <div className="topic-meta">{topic}</div>
        <h3>{title}</h3>
        <div className="meta">
          <span>
            <Clock size={12} />
            {duration}
          </span>
          <span>
            <CircleCheck size={12} />
            {questionCount} Qs
          </span>
          <span>
            <Users size={12} />
            {attempts}
          </span>
        </div>
        {isProgress && progress != null && (
          <div className="progress-bar">
            <div className="pf" style={{ width: `${progress}%` }} />
          </div>
        )}
        <div className="diff-row">
          <span className="lbl">Difficulty</span>
          <div className="diff-pills">
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className={`p${i <= difficulty ? " on" : ""}`} />
            ))}
          </div>
          <span className="lbl">
            {difficulty} / 5
          </span>
        </div>
      </div>
      <div className="foot">
        {isDone ? (
          <span className="cost">
            <div
              className="coin"
              style={{ background: "var(--rr-emerald-500)" }}
            >
              ✓
            </div>
            <b style={{ color: "var(--rr-emerald-500)" }}>+1</b> earned
          </span>
        ) : (
          <span className="cost">
            <div className="coin">{cost}</div>
            <b>{cost}</b> {cost === 1 ? "token" : "tokens"}
          </span>
        )}
        {isDone ? (
          <Link
            to={`/app/quizzes/${quizId}/result`}
            className="btn btn-secondary btn-sm"
          >
            Review
            <ArrowRight size={14} />
          </Link>
        ) : lockMessage ? (
          <Link
            to="/app/pricing"
            className="btn btn-secondary btn-sm"
            title={lockMessage}
          >
            <Lock size={12} />Unlock
            <ArrowRight size={14} />
          </Link>
        ) : (
          <Link
            to={`/app/quizzes/${quizId}/${isProgress ? "session" : "instructions"}`}
            className="btn btn-accent btn-sm"
          >
            {isProgress ? "Resume" : "Start"}
            <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </article>
  );
}
