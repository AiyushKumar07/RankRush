import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CircleCheck, CircleX, Clock, Zap, Check, X, ChevronDown,
  Sparkles, ArrowRight, ArrowUp, ArrowLeft, Coins, Flame,
  Medal, RefreshCw, Target, Trophy, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { leaderboardsAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./QuizResultPage.css";

const REVIEW_QUESTIONS = [
  { ix: "01", status: "correct", q: "Evaluate lim(x→2) (x² − 4) / (x − 2)", full: "Evaluate the following limit: lim(x→2) (x² − 4) / (x − 2)", yourAns: "4", correctAns: "4", explain: "Factor the numerator: (x − 2)(x + 2) / (x − 2) → cancel (x − 2) and substitute x = 2 to get 4. The hole in the function doesn't affect the limit." },
  { ix: "02", status: "correct", q: "If f(x) = (x² − 1) / (x − 1), is f continuous at x = 1?", full: null, yourAns: null, correctAns: null, explain: null },
  { ix: "03", status: "wrong", q: "Evaluate lim(x→0) (sin 3x − 3x) / x³ using L'Hôpital", full: "Evaluate the limit using L'Hôpital's rule, given direct substitution yields 0/0:\nlim(x→0) (sin 3x − 3x) / x³", yourAns: "B · −9/2", correctAns: "A · −1/2", explain: "Apply L'Hôpital three times — the form stays 0/0 each pass. Derivatives of sin 3x → 3 cos 3x → −9 sin 3x → −27 cos 3x; derivatives of x³ → 3x² → 6x → 6. The third pass gives −27 cos(0) / 6 = −27/6, but the numerator was sin 3x − 3x, so the first derivative is 3 cos 3x − 3 (which is 0 at x=0). Recompute: the answer is −1/2, not −9/2 — you stopped one pass too early.", defaultOpen: true },
  { ix: "04", status: "correct", q: "Find lim(x→∞) (3x² + 5) / (2x² − 7)" },
  { ix: "05", status: "correct", q: "Determine continuity of f(x) = |x| at x = 0" },
  { ix: "06", status: "correct", q: "Evaluate lim(x→0) (1 − cos x) / x²" },
  { ix: "07", status: "correct", q: "If lim(x→a) f(x) = L, is f(a) = L?" },
  { ix: "08", status: "correct", q: "Find the left-hand limit of f(x) = ⌊x⌋ at x = 2" },
  { ix: "09", status: "wrong", q: "Apply L'Hôpital twice: lim(x→0) (eˣ − 1 − x) / x²", full: "Evaluate the limit using L'Hôpital's rule twice:\nlim(x→0) (eˣ − 1 − x) / x²", yourAns: "D · 1", correctAns: "B · 1/2", explain: "First derivative: (eˣ − 1) / 2x, still 0/0. Second derivative: eˣ / 2. Substitute x = 0 → e⁰/2 = 1/2. Common slip: people forget the second derivative of x² is 2 (not 2x), which is exactly the trap on this question." },
  { ix: "10", status: "correct", q: "For what value of k is f continuous at x = 3? f(x) = (x² − 9) / (x − 3) for x ≠ 3, k for x = 3" },
  { ix: "11", status: "correct", q: "Squeeze theorem on x² sin(1/x) as x → 0" },
  { ix: "12", status: "correct", q: "Find lim(x→0) tan(x) / x" },
  { ix: "13", status: "correct", q: "Continuity of piecewise function with two cases" },
  { ix: "14", status: "correct", q: "lim(x→∞) (1 + 1/x)ˣ" },
  { ix: "15", status: "correct", q: "Removable discontinuity vs jump discontinuity" },
  { ix: "16", status: "correct", q: "Intermediate Value Theorem application" },
  { ix: "17", status: "correct", q: "lim(x→0) (√(1+x) − 1) / x using rationalization" },
  { ix: "18", status: "correct", q: "Continuity at endpoint of closed interval" },
  { ix: "19", status: "correct", q: "lim(x→∞) (ln x) / x" },
  { ix: "20", status: "correct", q: "Two-sided limit existence with absolute value" },
];

const TOPIC_BREAKDOWN = [
  { name: "Limits — direct substitution", qcount: "8 of 8 correct", pct: 100, tier: "good" },
  { name: "Continuity — definition checks", qcount: "7 of 8 correct", pct: 87.5, tier: "good" },
  { name: "L'Hôpital — 0/0 form", qcount: "3 of 4 correct", pct: 75, tier: "mid" },
];

export default function QuizResultPage() {
  const [reviewFilter, setReviewFilter] = useState("all");
  const { quizId } = useParams();
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState(null);
  const [lbLoading, setLbLoading] = useState(true);

  useEffect(() => {
    if (!quizId) { setLbLoading(false); return; }
    setLbLoading(true);
    leaderboardsAPI
      .getScope('QUIZ', quizId, { view: 'me', window: 4 })
      .then((res) => setLeaderboard(res?.data ?? res ?? null))
      .catch(() => setLeaderboard(null))
      .finally(() => setLbLoading(false));
  }, [quizId]);

  const correctCount = REVIEW_QUESTIONS.filter((r) => r.status === "correct").length;
  const wrongCount = REVIEW_QUESTIONS.filter((r) => r.status === "wrong").length;
  const flaggedCount = 2;

  const filtered =
    reviewFilter === "all"
      ? REVIEW_QUESTIONS
      : reviewFilter === "wrong"
        ? REVIEW_QUESTIONS.filter((r) => r.status === "wrong")
        : reviewFilter === "correct"
          ? REVIEW_QUESTIONS.filter((r) => r.status === "correct")
          : REVIEW_QUESTIONS;

  const filters = [
    { key: "all", label: "All", n: 20 },
    { key: "wrong", label: "Wrong", n: wrongCount },
    { key: "flagged", label: "Flagged", n: flaggedCount },
    { key: "correct", label: "Correct", n: correctCount },
  ];

  return (
    <div style={{ background: "var(--rr-bg)", minHeight: "100vh" }}>
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
            <span className="name">Limits &amp; continuity — your weak-spot mop-up</span>
          </div>
        </div>

        <div className="qs-center">
          <div className="qs-timer-done">
            <CircleCheck size={16} />
            <span className="time">Submitted · 09:24</span>
          </div>
        </div>

        <div className="qs-right">
          <ThemeToggle />
        </div>
      </header>

      {/* Results content */}
      <div className="results-shell">
        <div className="results-eyebrow">Quiz complete · auto-graded</div>

        {/* Score hero */}
        <div className="score-hero">
          <div className="topic">Mathematics · Calculus · Chapter 5</div>
          <h2>Limits &amp; continuity — your weak-spot mop-up</h2>

          <div className="score-row">
            <div className="big-score">
              <span className="num">18</span>
              <span className="out">/&nbsp;20</span>
            </div>

            <div className="score-mid">
              <div>
                <span className="label">Accuracy</span>
                <div className="acc">
                  90<span style={{ fontSize: 22, color: "var(--rr-ink-300)" }}>%</span>{" "}
                  <span className="accent" style={{ fontSize: 14, fontFamily: "var(--rr-font-display)" }}>↑ 22 pts</span>
                </div>
              </div>
              <div>
                <span className="label">Class median</span>
                <div className="acc" style={{ fontSize: 22, color: "var(--rr-ink-300)" }}>
                  11.4 <span style={{ fontSize: 13 }}>/ 20 · 57%</span>
                </div>
              </div>
              <div>
                <span className="label">Percentile</span>
                <div className="acc" style={{ fontSize: 22 }}>
                  Top <span className="accent">3%</span> in this quiz
                </div>
              </div>
            </div>

            <div className="rank-delta">
              <span className="lbl">Rank movement</span>
              <div className="now">
                <span className="from">#102</span>
                <ArrowRight size={14} className="arrow" />
                <span className="to">#88</span>
              </div>
              <span className="delta-pill">
                <ArrowUp size={12} />
                +14 ranks
              </span>
            </div>
          </div>

          <div className="reward-strip">
            <span className="pill token">
              <Coins size={14} />
              Earned <span className="lime">+1 token</span>
            </span>
            <span className="pill">
              <Flame size={14} />
              <span className="lime">17 → 18</span>-day streak saved
            </span>
            <span className="pill">
              <Medal size={14} />
              1 badge step closer · Calc Slayer (88/100)
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="result-stat-row">
          <div className="r-stat good">
            <div className="lbl"><CircleCheck size={12} />Correct</div>
            <div className="v">18<small> / 20</small></div>
            <div className="hint">Best run on this topic</div>
          </div>
          <div className="r-stat bad">
            <div className="lbl"><CircleX size={12} />Wrong</div>
            <div className="v">2</div>
            <div className="hint">Both on L'Hôpital cases</div>
          </div>
          <div className="r-stat violet">
            <div className="lbl"><Clock size={12} />Time</div>
            <div className="v">9:24<small> / 12:00</small></div>
            <div className="hint">2:36 left on the clock</div>
          </div>
          <div className="r-stat">
            <div className="lbl"><Zap size={12} />Avg / question</div>
            <div className="v">28<small>s</small></div>
            <div className="hint">Target was 60s</div>
          </div>
        </div>

        {/* Topic breakdown */}
        <div className="r-card">
          <div className="r-card-head">
            <div>
              <h3>Topic breakdown</h3>
              <span className="sub">Where you crushed it, and where you didn't</span>
            </div>
          </div>
          <div className="topic-bar">
            {TOPIC_BREAKDOWN.map((t) => (
              <div key={t.name} className={`tb-row ${t.tier}`}>
                <div className="name">
                  {t.name}
                  <span className="qcount">{t.qcount}</span>
                </div>
                <div className="bar">
                  <div className="fill" style={{ width: `${t.pct}%` }} />
                </div>
                <div className="acc">{Math.round(t.pct)}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quiz leaderboard — real data from /api/leaderboards/QUIZ/:quizId */}
        <QuizLeaderboardCard board={leaderboard} loading={lbLoading} meId={user?.id} />

        {/* Per-question review */}
        <div className="r-card">
          <div className="r-card-head">
            <div>
              <h3>Per-question review</h3>
              <span className="sub">
                Tap any row to see your answer, the correct one, and the why.
              </span>
            </div>
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
            {filtered.map((row) => (
              <details
                key={row.ix}
                className={`review-row ${row.status}`}
                open={row.defaultOpen}
              >
                <summary>
                  <span className="ix">{row.ix}</span>
                  <span className="marker">
                    {row.status === "correct" ? (
                      <Check size={14} />
                    ) : row.status === "wrong" ? (
                      <X size={14} />
                    ) : (
                      <span style={{ width: 14, height: 14 }} />
                    )}
                  </span>
                  <span className="q">{row.q}</span>
                  <ChevronDown size={16} className="chev" />
                </summary>
                {(row.full || row.explain) && (
                  <div className="review-body">
                    {row.full && (
                      <p className="q-full">{row.full}</p>
                    )}
                    {row.yourAns && row.correctAns && (
                      <div className="ans-row">
                        <div
                          className={`ans-block ${
                            row.status === "correct"
                              ? "your-correct"
                              : "your-wrong"
                          }`}
                        >
                          <div className="lb">Your answer</div>
                          <div className="val">{row.yourAns}</div>
                        </div>
                        <div className="ans-block right">
                          <div className="lb">Correct</div>
                          <div className="val">{row.correctAns}</div>
                        </div>
                      </div>
                    )}
                    {row.explain && (
                      <div className="explain">
                        <div className="lb">
                          <Sparkles size={12} />
                          Why
                        </div>
                        {row.explain}
                      </div>
                    )}
                  </div>
                )}
              </details>
            ))}
          </div>

          <div className="result-cta">
            <Link to="/app/quizzes" className="btn btn-secondary">
              <ArrowLeft size={16} />
              Back to quizzes
            </Link>
            <button className="btn btn-secondary">
              <RefreshCw size={16} />
              Retry quiz · 1 token
            </button>
            <button className="btn btn-accent">
              <Target size={16} />
              Practice L'Hôpital · 1 token
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Per-quiz leaderboard panel. Best-attempt scorer; tiebreak by time.
// Renders ±4 around the user when ranked, or a "not yet on board" hint
// for non-rewarding quizzes (which don't have a scope).
function QuizLeaderboardCard({ board, loading, meId }) {
  const rows = board?.rows ?? [];

  return (
    <div className="r-card">
      <div className="r-card-head">
        <div>
          <h3><Trophy size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />Quiz leaderboard</h3>
          <span className="sub">
            {board?.scope?.displayName
              ? `Best attempt · tiebreak by time. Your neighbours on ${board.scope.displayName}.`
              : 'Best attempt across all takers, tiebreak by time taken.'}
          </span>
        </div>
        {board?.meRank && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--rr-font-mono)', fontSize: 10, color: 'var(--rr-fg-dim)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Your rank</div>
            <div style={{ fontFamily: 'var(--rr-font-display)', fontWeight: 700, fontSize: 22 }}>#{board.meRank}</div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--rr-fg-muted)', fontSize: 13 }}>
          Loading leaderboard…
        </div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--rr-fg-muted)', fontSize: 13 }}>
          This quiz isn't ranked yet — leaderboards activate once it's marked rank-rewarding.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr 100px 80px',
          gap: 0,
          fontSize: 13,
          fontVariantNumeric: 'tabular-nums',
        }}>
          <div style={{ display: 'contents' }}>
            {['#', 'Player', 'Score', 'Δ'].map((h, i) => (
              <div
                key={h}
                style={{
                  fontFamily: 'var(--rr-font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--rr-fg-dim)',
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--rr-border)',
                  textAlign: i >= 2 ? 'right' : 'left',
                }}
              >{h}</div>
            ))}
          </div>
          {rows.map((r) => {
            const isMe = r.isMe === true || r.user?.id === meId;
            return (
              <div key={r.user.id} style={{ display: 'contents' }}>
                <div style={{
                  padding: '12px',
                  borderBottom: '1px solid var(--rr-border)',
                  background: isMe ? 'color-mix(in oklab, var(--rr-violet-500) 10%, transparent)' : 'transparent',
                  fontFamily: 'var(--rr-font-mono)',
                  fontWeight: 600,
                  color: r.rank <= 3 ? 'var(--rr-amber-500)' : 'var(--rr-fg)',
                }}>#{r.rank}</div>
                <div style={{
                  padding: '12px',
                  borderBottom: '1px solid var(--rr-border)',
                  background: isMe ? 'color-mix(in oklab, var(--rr-violet-500) 10%, transparent)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #7C6CFF 0%, #5D4FE8 100%)',
                    color: '#fff', display: 'grid', placeItems: 'center',
                    fontWeight: 600, fontSize: 12,
                  }}>{r.user.initials}</div>
                  <span>
                    {r.user.displayName}
                    {isMe && (
                      <span style={{
                        marginLeft: 6,
                        fontFamily: 'var(--rr-font-mono)',
                        fontSize: 9,
                        letterSpacing: '0.1em',
                        background: 'var(--rr-violet-500)',
                        color: '#fff',
                        padding: '2px 5px',
                        borderRadius: 3,
                      }}>YOU</span>
                    )}
                  </span>
                </div>
                <div style={{
                  padding: '12px',
                  borderBottom: '1px solid var(--rr-border)',
                  background: isMe ? 'color-mix(in oklab, var(--rr-violet-500) 10%, transparent)' : 'transparent',
                  textAlign: 'right', fontWeight: 600,
                }}>{Math.round(r.score)}%</div>
                <div style={{
                  padding: '12px',
                  borderBottom: '1px solid var(--rr-border)',
                  background: isMe ? 'color-mix(in oklab, var(--rr-violet-500) 10%, transparent)' : 'transparent',
                  textAlign: 'right', fontSize: 12,
                }}>
                  {r.delta == null
                    ? <span style={{ color: 'var(--rr-fg-dim)' }}>—</span>
                    : r.delta === 0
                      ? <span style={{ color: 'var(--rr-fg-dim)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Minus size={11} /> 0</span>
                      : r.delta > 0
                        ? <span style={{ color: 'var(--rr-emerald-500)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><TrendingUp size={11} /> +{r.delta}</span>
                        : <span style={{ color: 'var(--rr-coral-500)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><TrendingDown size={11} /> {r.delta}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
