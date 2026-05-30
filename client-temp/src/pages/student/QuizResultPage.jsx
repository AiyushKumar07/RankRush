import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import {
  CircleCheck, CircleX, Clock, Zap, Check, X, ChevronDown,
  Sparkles, ArrowLeft, AlertTriangle, Lock, Eye, EyeOff,
  RefreshCw, Trophy, TrendingUp, TrendingDown, Minus, Loader2,
} from "lucide-react";
import ThemeToggle from "../../components/ui/ThemeToggle";
import BrandLoader from "../../components/brand/BrandLoader";
import Modal from "../../components/ui/Modal";
import { studentAPI, leaderboardsAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./QuizResultPage.css";

const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];

function fmtTime(secs) {
  if (secs == null) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtSubmittedAt(date) {
  if (!date) return "";
  const d = new Date(date);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function optionLabelById(options, id, idx) {
  if (!id) return null;
  const i = options.findIndex((o) => o.id === id);
  if (i < 0) return id;
  const key = OPTION_KEYS[i] || i + 1;
  return `${key} · ${options[i].text}`;
}

export default function QuizResultPage() {
  const { quizId } = useParams();
  const { state } = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [result, setResult] = useState(state?.result ?? null);
  const [loading, setLoading] = useState(!state?.result);
  const [loadError, setLoadError] = useState(null);

  const [leaderboard, setLeaderboard] = useState(null);
  const [lbLoading, setLbLoading] = useState(true);

  const [reviewFilter, setReviewFilter] = useState("all");
  const [revealModalOpen, setRevealModalOpen] = useState(false);
  const [revealing, setRevealing] = useState(false);

  // Fetch the result if it wasn't passed via location.state (refresh path).
  useEffect(() => {
    if (state?.result || !quizId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    studentAPI
      .getQuizResult(quizId)
      .then((res) => {
        if (cancelled) return;
        setResult(res?.data ?? res ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err?.response?.data?.message || err?.message || "Couldn't load this result",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [quizId, state]);

  // Leaderboard for rank-rewarding quizzes (silently empty otherwise).
  useEffect(() => {
    if (!quizId) {
      setLbLoading(false);
      return;
    }
    setLbLoading(true);
    leaderboardsAPI
      .getScope("QUIZ", quizId, { view: "me", window: 4 })
      .then((res) => setLeaderboard(res?.data ?? res ?? null))
      .catch(() => setLeaderboard(null))
      .finally(() => setLbLoading(false));
  }, [quizId]);

  const quiz = result?.quiz || state?.quiz || null;
  const review = result?.review || [];
  const rankRewarding = !!quiz?.rankRewarding;
  const answersRevealed = !!result?.answersRevealed;
  // Retry stays open only when the quiz isn't rank-rewarding AND the
  // student hasn't peeked at the answers yet. BE returns canRetry as a
  // pre-computed mirror so the FE doesn't have to know both rules.
  const canRetry = result?.canRetry ?? (!rankRewarding && !answersRevealed);

  const handleReveal = async () => {
    if (revealing || answersRevealed) return;
    setRevealing(true);
    try {
      const res = await studentAPI.revealQuizAnswers(quizId);
      setResult(res?.data ?? res ?? null);
      setRevealModalOpen(false);
    } catch (err) {
      // Surface the BE message inline via the same error path
      setLoadError(err?.response?.data?.message || "Couldn't reveal answers");
    } finally {
      setRevealing(false);
    }
  };

  const correctCount = result?.correctCount ?? 0;
  const wrongCount = result?.incorrectCount ?? 0;
  const unanswered = result?.unansweredCount ?? 0;
  const totalQ = quiz?.totalQuestions ?? review.length;
  const score = result?.score ?? 0;
  const totalMarks = result?.totalMarks ?? quiz?.totalMarks ?? 0;
  const percentage = result?.percentage ?? 0;
  const timeTaken = result?.timeTakenSecs ?? 0;
  const timeLimit = quiz?.timeLimitMins ? quiz.timeLimitMins * 60 : 0;
  const timeLeft = Math.max(0, timeLimit - timeTaken);
  const avgPerQ = totalQ ? Math.round(timeTaken / totalQ) : 0;
  const targetPerQ = quiz?.timeLimitMins && totalQ
    ? Math.round((quiz.timeLimitMins * 60) / totalQ)
    : 60;

  const previousPct = result?.previous?.percentage ?? null;
  const accuracyDelta = previousPct != null ? percentage - previousPct : null;
  const classMedianPct = result?.classMedian?.percentage ?? null;
  const classMedianScore = result?.classMedian?.score ?? null;
  const percentile = result?.percentile ?? null;

  // Topic breakdown — group review by topic
  const topicBreakdown = useMemo(() => {
    const m = new Map();
    review.forEach((r) => {
      const key = r.topic || r.chapter || r.subject || "General";
      const entry = m.get(key) || { name: key, total: 0, correct: 0 };
      entry.total += 1;
      if (r.status === "correct") entry.correct += 1;
      m.set(key, entry);
    });
    return Array.from(m.values())
      .map((t) => ({
        ...t,
        pct: t.total ? (t.correct / t.total) * 100 : 0,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [review]);

  const filtered = useMemo(() => {
    if (reviewFilter === "all") return review;
    if (reviewFilter === "wrong") return review.filter((r) => r.status === "wrong");
    if (reviewFilter === "correct") return review.filter((r) => r.status === "correct");
    if (reviewFilter === "unanswered") return review.filter((r) => r.status === "unanswered");
    return review;
  }, [review, reviewFilter]);

  const filters = [
    { key: "all", label: "All", n: review.length },
    { key: "wrong", label: "Wrong", n: wrongCount },
    { key: "unanswered", label: "Skipped", n: unanswered },
    { key: "correct", label: "Correct", n: correctCount },
  ];

  if (loading) return <BrandLoader />;

  if (loadError || !result) {
    return (
      <div className="qr-error-wrap">
        <div className="qr-error-card">
          <AlertTriangle size={28} className="qr-error-ic" />
          <h2>Result not available</h2>
          <p>{loadError || "We couldn't load this attempt."}</p>
          <Link to="/app/quizzes" className="btn btn-secondary">
            <ArrowLeft size={14} /> Back to quizzes
          </Link>
        </div>
      </div>
    );
  }

  const headLabel = [quiz?.subject, quiz?.chapter, quiz?.difficulty]
    .filter(Boolean)
    .join(" · ");

  const isProctoringFailure = !!result.isProctoringFailure;

  return (
    <div style={{ background: "var(--rr-bg)", minHeight: "100vh" }}>
      {/* Top bar */}
      <header className="qs-top">
        <div className="qs-left">
          <Link to="/app/quizzes" aria-label="Back to quizzes">
            <div className="rr-mark">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 14L12 7L19 14" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 19L12 12L19 19" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
              </svg>
            </div>
          </Link>
          <div className="qs-title">
            <span className="label">{headLabel || "Quiz result"}</span>
            <span className="name">{quiz?.title || "Quiz"}</span>
          </div>
        </div>

        <div className="qs-center">
          <div className="qs-timer-done">
            <CircleCheck size={16} />
            <span className="time">
              Submitted{result.completedAt ? ` · ${fmtSubmittedAt(result.completedAt)}` : ""}
            </span>
          </div>
        </div>

        <div className="qs-right">
          <ThemeToggle />
        </div>
      </header>

      <div className="results-shell">
        <div className="results-eyebrow">
          {isProctoringFailure ? "Submission rejected · proctoring violation" : "Quiz complete · auto-graded"}
        </div>

        {/* Score hero */}
        <div className={`score-hero${isProctoringFailure ? " failed" : ""}`}>
          {(quiz?.subject || quiz?.chapter) && (
            <div className="topic">
              {[quiz?.subject, quiz?.chapter, quiz?.topic].filter(Boolean).join(" · ")}
            </div>
          )}
          <h2>{quiz?.title || "Quiz"}</h2>

          <div className="score-row">
            <div className="big-score">
              <span className="num">{Math.max(0, score)}</span>
              <span className="out">/&nbsp;{totalMarks}</span>
            </div>

            <div className="score-mid">
              <div>
                <span className="label">Accuracy</span>
                <div className="acc">
                  {percentage}
                  <span style={{ fontSize: 22, opacity: 0.6 }}>%</span>{" "}
                  {accuracyDelta != null && accuracyDelta !== 0 && (
                    <span
                      className="accent"
                      style={{
                        fontSize: 14,
                        fontFamily: "var(--rr-font-display)",
                        color: accuracyDelta > 0 ? "var(--rr-lime-400)" : "var(--rr-coral-500)",
                      }}
                    >
                      {accuracyDelta > 0 ? "↑" : "↓"} {Math.abs(accuracyDelta)} pts
                    </span>
                  )}
                  {accuracyDelta == null && previousPct == null && (
                    <span style={{ fontSize: 12, opacity: 0.55 }}>first attempt</span>
                  )}
                </div>
              </div>
              {classMedianPct != null && (
                <div>
                  <span className="label">Class median</span>
                  <div className="acc" style={{ fontSize: 22, opacity: 0.85 }}>
                    {classMedianScore != null && (
                      <>
                        {classMedianScore}{" "}
                        <span style={{ fontSize: 13 }}>
                          / {totalMarks} · {classMedianPct}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
              {percentile != null && (
                <div>
                  <span className="label">Percentile</span>
                  <div className="acc" style={{ fontSize: 22 }}>
                    Top <span className="accent">{Math.max(1, 100 - percentile + 1)}%</span> in this quiz
                  </div>
                </div>
              )}
            </div>

            {leaderboard?.meRank && (
              <div className="rank-delta">
                <span className="lbl">Rank</span>
                <div className="now">
                  <span className="to">#{leaderboard.meRank}</span>
                </div>
                <span className="delta-pill">
                  <Trophy size={12} />
                  on {leaderboard?.scope?.displayName || "this quiz"}
                </span>
              </div>
            )}
          </div>

          {isProctoringFailure && (
            <div className="qr-proctor-banner">
              <AlertTriangle size={14} />
              This attempt was disqualified for a proctoring violation. No score, XP or rank update was recorded.
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="result-stat-row">
          <div className="r-stat good">
            <div className="lbl"><CircleCheck size={12} />Correct</div>
            <div className="v">{correctCount}<small> / {totalQ}</small></div>
            <div className="hint">
              {percentage}% accuracy
            </div>
          </div>
          <div className="r-stat bad">
            <div className="lbl"><CircleX size={12} />Wrong</div>
            <div className="v">{wrongCount}</div>
            <div className="hint">
              {unanswered > 0 ? `${unanswered} skipped` : "All attempted"}
            </div>
          </div>
          <div className="r-stat violet">
            <div className="lbl"><Clock size={12} />Time</div>
            <div className="v">
              {fmtTime(timeTaken)}{timeLimit ? <small> / {fmtTime(timeLimit)}</small> : null}
            </div>
            <div className="hint">
              {timeLeft > 0 ? `${fmtTime(timeLeft)} left on the clock` : "Used the full timer"}
            </div>
          </div>
          <div className="r-stat">
            <div className="lbl"><Zap size={12} />Avg / question</div>
            <div className="v">{avgPerQ}<small>s</small></div>
            <div className="hint">Target was {targetPerQ}s</div>
          </div>
        </div>

        {/* Topic breakdown */}
        {topicBreakdown.length > 0 && (
          <div className="r-card">
            <div className="r-card-head">
              <div>
                <h3>Topic breakdown</h3>
                <span className="sub">Where you crushed it, and where you didn't</span>
              </div>
            </div>
            <div className="topic-bar">
              {topicBreakdown.map((t) => {
                const tier = t.pct >= 80 ? "good" : t.pct >= 50 ? "mid" : "bad";
                return (
                  <div key={t.name} className={`tb-row ${tier}`}>
                    <div className="name">
                      {t.name}
                      <span className="qcount">{t.correct} of {t.total} correct</span>
                    </div>
                    <div className="bar">
                      <div className="fill" style={{ width: `${t.pct}%` }} />
                    </div>
                    <div className="acc">{Math.round(t.pct)}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quiz leaderboard */}
        <QuizLeaderboardCard board={leaderboard} loading={lbLoading} meId={user?.id} />

        {/* Per-question review */}
        <div className="r-card">
          <div className="r-card-head">
            <div>
              <h3>Per-question review</h3>
              <span className="sub">
                {answersRevealed
                  ? "Correct answers and explanations are visible below."
                  : "Your right/wrong status is shown. Reveal correct answers to learn — note that this locks future retries."}
              </span>
            </div>
            {!answersRevealed && (
              <button
                type="button"
                className="btn btn-secondary qr-reveal-btn"
                onClick={() => setRevealModalOpen(true)}
              >
                <Eye size={14} />
                Reveal correct answers
              </button>
            )}
            {answersRevealed && (
              <span className="qr-reveal-tag">
                <Lock size={12} />
                Answers revealed · retry locked
              </span>
            )}
          </div>

          <div className="review-filters">
            {filters.map((f) => (
              <button
                key={f.key}
                className={`chip${reviewFilter === f.key ? " on" : ""}`}
                onClick={() => setReviewFilter(f.key)}
              >
                {f.label} <span className="n">{f.n}</span>
              </button>
            ))}
          </div>

          <div className="review-list">
            {filtered.map((row) => {
              const ix = String(row.index).padStart(2, "0");
              const yourAns = row.studentAnswer
                .map((id, i) => optionLabelById(row.options, id, i))
                .filter(Boolean)
                .join(", ");
              const correctAns = row.correctAnswer
                .map((id, i) => optionLabelById(row.options, id, i))
                .filter(Boolean)
                .join(", ");
              // Pre-reveal: only the question + the student's own answer
              // are exposed; correct answer + explanation stay hidden.
              const showCorrect = answersRevealed && correctAns;
              const showExplanation = answersRevealed && !!row.explanation;
              const hasExpansion = !!(showCorrect || showExplanation || yourAns || row.question);
              const defaultOpen = answersRevealed && row.status === "wrong";
              return (
                <details key={row.questionId} className={`review-row ${row.status}`} open={defaultOpen}>
                  <summary>
                    <span className="ix">{ix}</span>
                    <span className="marker">
                      {row.status === "correct" ? (
                        <Check size={14} />
                      ) : row.status === "wrong" ? (
                        <X size={14} />
                      ) : (
                        <Minus size={14} />
                      )}
                    </span>
                    <span className="q">{row.question || "—"}</span>
                    {row.timeTakenSecs > 0 && (
                      <span className="q-time"><Clock size={11} /> {row.timeTakenSecs}s</span>
                    )}
                    <ChevronDown size={16} className="chev" />
                  </summary>
                  {hasExpansion && (
                    <div className="review-body">
                      {row.question && <p className="q-full">{row.question}</p>}
                      <div className="ans-row">
                        <div className={`ans-block ${row.status === "correct" ? "your-correct" : "your-wrong"}`}>
                          <div className="lb">Your answer</div>
                          <div className="val">{yourAns || "— skipped"}</div>
                        </div>
                        <div className="ans-block right">
                          <div className="lb">Correct</div>
                          <div className="val">
                            {showCorrect ? (
                              correctAns
                            ) : (
                              <span className="qr-blurred">
                                <Lock size={12} /> Hidden — reveal to view
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {showExplanation && (
                        <div className="explain">
                          <div className="lb">
                            <Sparkles size={12} /> Why
                          </div>
                          {row.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </details>
              );
            })}
            {filtered.length === 0 && (
              <div className="qr-empty">No questions in this filter.</div>
            )}
          </div>

          <div className="result-cta">
            <Link to="/app/quizzes" className="btn btn-secondary">
              <ArrowLeft size={16} />
              Back to quizzes
            </Link>
            {canRetry ? (
              <button
                type="button"
                className="btn btn-accent"
                onClick={() => navigate(`/app/quizzes/${quizId}/instructions`)}
              >
                <RefreshCw size={16} />
                Retry quiz{quiz?.attemptCost ? ` · ${quiz.attemptCost} token${quiz.attemptCost === 1 ? "" : "s"}` : ""}
              </button>
            ) : (
              <span
                className="qr-retry-locked"
                title={
                  rankRewarding
                    ? "Rank-rewarding quizzes are one-shot"
                    : "You've revealed the correct answers"
                }
              >
                <Lock size={14} />
                {rankRewarding ? "Rank-rewarding · no retry" : "Retry locked · answers revealed"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Confirm-reveal modal */}
      <Modal
        open={revealModalOpen}
        onClose={revealing ? undefined : () => setRevealModalOpen(false)}
        title="Reveal correct answers?"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setRevealModalOpen(false)}
              disabled={revealing}
            >
              Keep them hidden
            </button>
            <button
              className="btn btn-accent"
              onClick={handleReveal}
              disabled={revealing}
            >
              {revealing ? <Loader2 size={14} className="qr-spin" /> : <Eye size={14} />}
              {revealing ? "Revealing…" : "Yes, reveal answers"}
            </button>
          </>
        }
      >
        <p style={{ color: "var(--rr-fg-2)", fontSize: 14, margin: "0 0 12px" }}>
          You'll see the correct answer and explanation for every question.
        </p>
        <div className="qr-reveal-warn">
          <AlertTriangle size={14} />
          <div>
            <strong>This locks retries.</strong>{" "}
            {rankRewarding
              ? "This is a rank-rewarding quiz, so retries were already disabled."
              : "Once revealed, you won't be able to attempt this quiz again — even though it's a practice quiz."}
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Per-quiz leaderboard panel
function QuizLeaderboardCard({ board, loading, meId }) {
  const rows = board?.rows ?? [];

  return (
    <div className="r-card">
      <div className="r-card-head">
        <div>
          <h3>
            <Trophy size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />
            Quiz leaderboard
          </h3>
          <span className="sub">
            {board?.scope?.displayName
              ? `Best attempt · tiebreak by time. Your neighbours on ${board.scope.displayName}.`
              : "Best attempt across all takers, tiebreak by time taken."}
          </span>
        </div>
        {board?.meRank && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--rr-font-mono)", fontSize: 10, color: "var(--rr-fg-dim)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Your rank</div>
            <div style={{ fontFamily: "var(--rr-font-display)", fontWeight: 700, fontSize: 22 }}>#{board.meRank}</div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="qr-empty">Loading leaderboard…</div>
      ) : rows.length === 0 ? (
        <div className="qr-empty">
          This quiz isn't ranked yet — leaderboards activate once it's marked rank-rewarding.
        </div>
      ) : (
        <div className="qr-lb-grid">
          {["#", "Player", "Score", "Δ"].map((h, i) => (
            <div key={h} className={`qr-lb-head${i >= 2 ? " right" : ""}`}>{h}</div>
          ))}
          {rows.map((r) => {
            const isMe = r.isMe === true || r.user?.id === meId;
            return (
              <div key={r.user.id} style={{ display: "contents" }}>
                <div className={`qr-lb-cell qr-lb-rank${isMe ? " me" : ""}${r.rank <= 3 ? " podium" : ""}`}>
                  #{r.rank}
                </div>
                <div className={`qr-lb-cell qr-lb-player${isMe ? " me" : ""}`}>
                  <div className="qr-lb-avatar">{r.user.initials}</div>
                  <span>
                    {r.user.displayName}
                    {isMe && <span className="qr-lb-you">YOU</span>}
                  </span>
                </div>
                <div className={`qr-lb-cell right${isMe ? " me" : ""}`} style={{ fontWeight: 600 }}>
                  {Math.round(r.score)}%
                </div>
                <div className={`qr-lb-cell right${isMe ? " me" : ""}`}>
                  {r.delta == null ? (
                    <span style={{ color: "var(--rr-fg-dim)" }}>—</span>
                  ) : r.delta === 0 ? (
                    <span style={{ color: "var(--rr-fg-dim)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Minus size={11} /> 0
                    </span>
                  ) : r.delta > 0 ? (
                    <span style={{ color: "var(--rr-emerald-500)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <TrendingUp size={11} /> +{r.delta}
                    </span>
                  ) : (
                    <span style={{ color: "var(--rr-coral-500)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <TrendingDown size={11} /> {r.delta}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
