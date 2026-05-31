import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutGrid, Shuffle, FileText, Bookmark, History, Clock,
  CircleCheck, Zap, TrendingUp, Play, Sparkles, ArrowLeft,
  ArrowRight, ArrowDownUp, List, Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { SegmentedTabs, FilterChipGroup } from "../../components/ui/Tabs";
import Select from "../../components/ui/Select";
import QuizCard from "../../components/student/QuizCard";
import { useEntitlements } from "../../hooks/useEntitlements";
import { studentAPI } from "../../services/api";
import "./QuizzesPage.css";

// ── Static filter chip sets ──────────────────────────────────────────
const DIFFICULTY_CHIPS = [
  { key: "any", label: "Any" },
  { key: "Easy", label: "Easy" },
  { key: "Medium", label: "Medium" },
  { key: "Hard", label: "Hard" },
  { key: "Expert", label: "Expert" },
];
const TIME_CHIPS = [
  { key: "any", label: "Any" },
  { key: "lt10", label: "< 10 min" },
  { key: "10-20", label: "10–20 min" },
  { key: "gt20", label: "> 20 min" },
];
const STATUS_CHIPS = [
  { key: "new", label: "New" },
  { key: "progress", label: "In progress" },
  { key: "done", label: "Completed" },
];

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended for you" },
  { value: "popular",     label: "Most popular" },
  { value: "newest",      label: "Newest first" },
  { value: "hardest",     label: "Hardest first" },
  { value: "shortest",    label: "Shortest first" },
];

// Backend stores Quiz.subject as a free-text label ("Mathematics", "Physics",
// etc). The UI needs both a colour-key (for the band + dot + difficulty pills)
// and a friendly label. This is the canonical mapping; anything not matched
// falls back to a neutral "mixed" treatment.
const SUBJECT_KEYS = [
  { match: /math/i,        key: "math",    dot: "var(--rr-violet-500)" },
  { match: /physics/i,     key: "physics", dot: "var(--rr-cyan-500)" },
  { match: /chem/i,        key: "chem",    dot: "var(--rr-amber-500)" },
  { match: /(bio|botany|zoology)/i, key: "bio", dot: "var(--rr-emerald-500)" },
];
function subjectKeyFor(subject) {
  if (!subject) return "mixed";
  const hit = SUBJECT_KEYS.find((s) => s.match.test(subject));
  return hit?.key ?? "mixed";
}
function subjectDotFor(subject) {
  return SUBJECT_KEYS.find((s) => s.match.test(subject))?.dot ?? null;
}

function unwrap(res) { return res?.data ?? res ?? null; }

// Map a quiz row (server payload) → QuizCard props.
function rowToCardProps(q) {
  const subjectKey = subjectKeyFor(q.subject);
  const status = q.isCompleted ? "done" : q.inProgress ? "progress" : "new";
  const minutes = q.timeLimitMins || 0;
  const duration =
    minutes >= 60 && minutes % 60 === 0
      ? `${minutes / 60} hour${minutes / 60 > 1 ? "s" : ""}`
      : `${minutes} min`;

  // Map enum-ish difficulty → 1–5 pill count.
  const diffMap = { Easy: 1, Medium: 3, Hard: 4, Expert: 5 };
  const difficulty = diffMap[q.difficulty] ?? 3;

  const attemptsLabel = formatCount(q.attempts || 0);

  let statusText;
  if (status === "done" && q.lastScore != null) {
    statusText = `✓ Completed · ${q.lastScore}%`;
  } else if (status === "progress") {
    statusText = "↻ In progress";
  }

  return {
    quizId: q.id,
    subject: subjectKey,
    subjectLabel: q.subject,
    topic: [q.chapter, q.topic].filter(Boolean).join(" · ") || q.subject,
    title: q.title,
    questionCount: q.totalQuestions,
    duration,
    attempts: `${attemptsLabel} attempts`,
    difficulty,
    status,
    cost: q.attemptCost ?? 1,
    statusText,
    quizStartsAt: q.quizStartsAt,
    quizEndsAt: q.quizEndsAt,
    paperType: q.paperType,
    saved: !!q.isSaved,
  };
}

function formatCount(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export default function QuizzesPage() {
  const [facets, setFacets] = useState(null);
  const [activeSubject, setActiveSubject] = useState("all"); // 'all' | actual subject string | 'saved' | 'papers'
  const [difficulty, setDifficulty] = useState("any");
  const [time, setTime] = useState("any");
  const [status, setStatus] = useState(null);
  const [sort, setSort] = useState("recommended");
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);

  const [pick, setPick] = useState(null);
  const [pickLoading, setPickLoading] = useState(true);

  const [quizzes, setQuizzes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 12 });
  const [loadingList, setLoadingList] = useState(true);
  const [savingIds, setSavingIds] = useState(() => new Set());

  const { hasFeature, loading: entLoading } = useEntitlements();

  // ── Facets + today's pick (mount-only) ─────────────────────────────
  useEffect(() => {
    studentAPI.getQuizFacets()
      .then((res) => setFacets(unwrap(res)))
      .catch(() => setFacets({ subjects: [], paperTypes: [], totals: { all: 0, saved: 0, history: 0 } }));
    setPickLoading(true);
    studentAPI.getTodaysPick()
      .then((res) => setPick(unwrap(res)?.pick ?? null))
      .catch(() => setPick(null))
      .finally(() => setPickLoading(false));
  }, []);

  // ── Quiz list — refetch on any filter change ───────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    setLoadingList(true);

    const isSaved = activeSubject === "saved";
    const isPapers = activeSubject === "papers";

    const params = {
      page,
      limit: 12,
      sort,
      ...(difficulty !== "any" && { difficulty }),
      ...(time !== "any" && { time }),
      ...(status && { status }),
      ...(isSaved && { savedOnly: "true" }),
      ...(isPapers && { type: "PYQ" }),
      ...(!isSaved && !isPapers && activeSubject !== "all" && { subject: activeSubject }),
    };

    studentAPI.listAvailableQuizzes(params)
      .then((res) => {
        const data = unwrap(res);
        setQuizzes(data?.quizzes || []);
        setPagination(res?.pagination || { page: 1, pages: 1, total: 0, limit: 12 });
      })
      .catch((err) => {
        if (err?.name !== "CanceledError") {
          toast.error(err?.message || "Failed to load quizzes");
          setQuizzes([]);
        }
      })
      .finally(() => setLoadingList(false));

    return () => ctrl.abort();
  }, [activeSubject, difficulty, time, status, sort, page]);

  // Reset to page 1 whenever filters change.
  useEffect(() => { setPage(1); }, [activeSubject, difficulty, time, status, sort]);

  // ── Subject tabs built from facets ─────────────────────────────────
  const subjectTabs = useMemo(() => {
    const totals = facets?.totals || { all: 0, saved: 0, history: 0 };
    const subjects = facets?.subjects || [];
    const papers = (facets?.paperTypes || []).find((p) => p.key === "PYQ");

    return [
      { key: "all", label: "All", icon: <LayoutGrid size={15} />, count: totals.all },
      ...subjects.map((s) => ({
        key: s.key,
        label: s.key,
        dot: subjectDotFor(s.key),
        count: s.count,
      })),
      ...(papers ? [{ key: "papers", label: "Previous papers", icon: <FileText size={15} />, count: papers.count }] : []),
      { key: "saved", label: "Saved", icon: <Bookmark size={15} />, count: totals.saved },
    ];
  }, [facets]);

  const resolveLock = useCallback((quiz) => {
    if (entLoading) return null;
    if (quiz.paperType === "FULL_MOCK" && !hasFeature("MOCK_TESTS")) {
      return "Full-length mock tests require Starter or Pro.";
    }
    if (quiz.paperType === "PYQ" && !hasFeature("PYQ_ACCESS")) {
      return "Previous-year papers require Starter or Pro.";
    }
    return null;
  }, [entLoading, hasFeature]);

  // ── Save / unsave (optimistic) ─────────────────────────────────────
  const onToggleSave = useCallback(async (quizId, wasSaved) => {
    setSavingIds((s) => new Set(s).add(quizId));
    setQuizzes((qs) => qs.map((q) => (q.id === quizId ? { ...q, isSaved: !wasSaved } : q)));
    try {
      if (wasSaved) await studentAPI.unsaveQuiz(quizId);
      else await studentAPI.saveQuiz(quizId);
      // Keep facet totals in sync so the Saved chip count stays accurate.
      setFacets((f) =>
        f
          ? { ...f, totals: { ...f.totals, saved: Math.max(0, (f.totals?.saved ?? 0) + (wasSaved ? -1 : 1)) } }
          : f,
      );
    } catch (err) {
      // Rollback on failure.
      setQuizzes((qs) => qs.map((q) => (q.id === quizId ? { ...q, isSaved: wasSaved } : q)));
      toast.error(err?.message || "Couldn't update saved");
    } finally {
      setSavingIds((s) => {
        const next = new Set(s);
        next.delete(quizId);
        return next;
      });
    }
  }, []);

  // ── Pager (windowed) ───────────────────────────────────────────────
  const pageButtons = useMemo(() => {
    const pages = pagination.pages || 1;
    if (pages <= 6) return Array.from({ length: pages }, (_, i) => i + 1);
    const out = [1, 2, 3, 4];
    if (page > 4 && page < pages - 1) out.push("…", page);
    out.push("…", pages);
    return out;
  }, [pagination.pages, page]);

  // ── Page subtitle text ────────────────────────────────────────────
  const subjectCount = subjectTabs.find((t) => t.key === activeSubject)?.count ?? 0;
  const subtitle = activeSubject === "saved"
    ? `${pagination.total} saved quiz${pagination.total === 1 ? "" : "zes"} ready to attempt.`
    : `${facets?.totals?.all ?? 0} quizzes calibrated to your class · ${subjectCount} in this section.`;

  return (
    <div className="main">
      {/* Page head */}
      <div className="page-head">
        <div>
          <div className="crumb">
            <Link to="/app">Home</Link> / Quizzes
          </div>
          <h1>Quizzes</h1>
          <p className="sub">{subtitle}</p>
        </div>
        <div className="head-actions">
          <button
            type="button"
            className={`btn btn-secondary${activeSubject === "saved" ? " on" : ""}`}
            onClick={() => setActiveSubject(activeSubject === "saved" ? "all" : "saved")}
          >
            <Bookmark size={16} />
            My saved
            {facets?.totals?.saved ? <span style={{ marginLeft: 6, opacity: 0.7 }}>· {facets.totals.saved}</span> : null}
          </button>
          <Link to="/app/quizzes/history" className="btn btn-secondary">
            <History size={16} />
            History
            {facets?.totals?.history ? <span style={{ marginLeft: 6, opacity: 0.7 }}>· {facets.totals.history}</span> : null}
          </Link>
        </div>
      </div>

      {/* Subject tabs */}
      <SegmentedTabs items={subjectTabs} activeKey={activeSubject} onChange={setActiveSubject} />

      {/* Filter row */}
      <div className="filter-row">
        <FilterChipGroup label="Difficulty" items={DIFFICULTY_CHIPS} activeKey={difficulty} onChange={setDifficulty} />
        <div className="filter-divider" />
        <FilterChipGroup label="Time" items={TIME_CHIPS} activeKey={time} onChange={setTime} />
        <div className="filter-divider" />
        <FilterChipGroup
          label="Status"
          items={STATUS_CHIPS}
          activeKey={status}
          onChange={(k) => setStatus((cur) => (cur === k ? null : k))}
        />
        <div className="sort">
          <ArrowDownUp size={14} />
          <span className="sort-lbl">Sort</span>
          <Select
            value={sort}
            onChange={setSort}
            options={SORT_OPTIONS}
            ariaLabel="Sort quizzes"
            className="sort-select"
          />
        </div>
      </div>

      {/* Today's pick — only when "All" view, has a pick, and not searching */}
      {activeSubject === "all" && (pick || pickLoading) && (
        <FeaturedCard pick={pick} loading={pickLoading} />
      )}

      {/* Section title */}
      <div className="sec-title">
        <h2>
          {activeSubject === "saved" ? "Saved quizzes"
            : activeSubject === "papers" ? "Previous-year papers"
            : activeSubject === "all" ? "All quizzes"
            : activeSubject}
        </h2>
        <div className="right">
          <span className="sub">
            {pagination.total > 0
              ? `Showing ${(page - 1) * pagination.limit + 1}–${Math.min(page * pagination.limit, pagination.total)} of ${pagination.total}`
              : "No matching quizzes"}
          </span>
          <div className="view-toggle">
            <button className={viewMode === "grid" ? "on" : ""} title="Grid" onClick={() => setViewMode("grid")}>
              <LayoutGrid size={15} />
            </button>
            <button className={viewMode === "list" ? "on" : ""} title="List" onClick={() => setViewMode("list")}>
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className={viewMode === "list" ? "quiz-list" : "quiz-grid"}>
        {loadingList ? (
          <div className="quiz-empty"><Loader2 size={18} className="quiz-spin" />  Loading quizzes…</div>
        ) : quizzes.length === 0 ? (
          <div className="quiz-empty">
            <strong>Nothing here yet.</strong>
            {activeSubject === "saved"
              ? "Tap the bookmark icon on any quiz to save it for later."
              : "Try clearing some filters to see more results."}
          </div>
        ) : (
          quizzes.map((q) => {
            const props = rowToCardProps(q);
            return (
              <QuizCard
                key={q.id}
                {...props}
                lockMessage={resolveLock(q)}
                onToggleSave={() => onToggleSave(q.id, !!q.isSaved)}
                saving={savingIds.has(q.id)}
              />
            );
          })
        )}
      </div>

      {/* Pager */}
      {pagination.pages > 1 && (
        <div className="pager">
          <button title="Previous" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            <ArrowLeft size={14} />
          </button>
          {pageButtons.map((n, i) => n === "…" ? (
            <span key={`gap-${i}`} className="ellipsis">…</span>
          ) : (
            <button key={n} className={page === n ? "on" : ""} onClick={() => setPage(n)}>{n}</button>
          ))}
          <button title="Next" onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Today's Pick card ────────────────────────────────────────────────
function FeaturedCard({ pick, loading }) {
  if (loading) {
    return (
      <div className="featured-card">
        <div>
          <span className="lbl"><Sparkles size={12} />★ Today's pick</span>
          <h2 style={{ marginTop: 18, opacity: 0.6 }}>Picking the best quiz for you…</h2>
        </div>
      </div>
    );
  }
  if (!pick) return null;

  const ctx = pick.context || {};
  const last = ctx.lastSubjectAttempt;
  const classAvg = ctx.classAvg;
  const minutes = pick.timeLimitMins || 0;
  const duration =
    minutes >= 60 && minutes % 60 === 0
      ? `${minutes / 60} hour${minutes / 60 > 1 ? "s" : ""}`
      : `${minutes} min`;
  const topic = [pick.subject, pick.chapter, pick.topic].filter(Boolean).join(" · ");

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!pick.quizStartsAt && !pick.quizEndsAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [pick.quizStartsAt, pick.quizEndsAt]);

  const starts = pick.quizStartsAt ? new Date(pick.quizStartsAt).getTime() : null;
  const ends = pick.quizEndsAt ? new Date(pick.quizEndsAt).getTime() : null;

  const isUpcoming = starts && starts > now;
  const isLive = starts && ends && starts <= now && ends > now;
  const isEnded = ends && ends <= now;

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    if (d >= 30) {
      const months = Math.floor(d / 30);
      const days = d % 30;
      return days > 0 ? `${months}mo ${days}d` : `${months}mo`;
    }
    if (d > 0) {
      return `${d}d ${h}h ${m}m`;
    }
    return `${h}h ${m}m ${s}s`;
  };

  const cost = pick.attemptCost ?? 1;
  const costLabel = cost === 0 ? 'Free' : `${cost} token${cost === 1 ? '' : 's'}`;
  
  let kindLabel = pick.kind === 'resume'   ? 'Resume in progress'
                  : pick.kind === 'live'     ? 'Live · closing soon'
                  : pick.kind === 'upcoming' ? 'Upcoming contest'
                  : 'Suggested for you';

  if (isUpcoming) kindLabel = `Upcoming in ${formatTime(starts - now)}`;
  else if (isLive) kindLabel = `Ending in ${formatTime(ends - now)}`;
  else if (isEnded) kindLabel = "Ended";

  const ctaVerb = pick.kind === 'resume' ? 'Resume quiz' : 'Start quiz';

  return (
    <div className="featured-card">
      <div>
        <span className="lbl"><Sparkles size={12} />★ Today's pick · {kindLabel}</span>
        <div className="topic" style={{ marginTop: 18 }}>{topic}</div>
        <h2>{pick.title}</h2>
        {pick.description && <p className="desc">{pick.description}</p>}
        <div className="meta-row">
          <span><Clock size={13} />{duration}</span>
          <span><CircleCheck size={13} />{pick.totalQuestions} questions</span>
          {pick.difficulty && <span><Zap size={13} />{pick.difficulty}</span>}
          {pick.rankRewarding && <span><TrendingUp size={13} />Rank-rewarding</span>}
        </div>
        <div className="cta-row">
          {isUpcoming ? (
            <button className="btn btn-lime btn-lg" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
              Starts in {formatTime(starts - now)}
            </button>
          ) : isEnded ? (
            <button className="btn btn-lime btn-lg" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
              Ended
            </button>
          ) : (
            <Link to={`/app/quizzes/${pick.id}/${pick.kind === 'resume' ? 'session' : 'instructions'}`} className="btn btn-lime btn-lg">
              <Play size={16} />
              {ctaVerb} · {costLabel}
            </Link>
          )}
        </div>
      </div>
      <div className="featured-side">
        <div>
          <div className="lbl-small">Your last attempt · {pick.subject}</div>
          <div className="stat-row" style={{ marginTop: 4 }}>
            {last ? (
              <>
                <span className="big">{last.percentage}%</span>
                <span className="small">{last.quizTitle}</span>
              </>
            ) : (
              <span className="small">No prior attempt yet</span>
            )}
          </div>
        </div>
        <hr />
        <div>
          <div className="lbl-small">Class average · this quiz</div>
          <div className="stat-row" style={{ marginTop: 4 }}>
            {classAvg ? (
              <>
                <span className="big">{classAvg.percentage}%</span>
                <span className="small">{classAvg.totalParticipants} attempts</span>
              </>
            ) : (
              <span className="small">Be the first to attempt</span>
            )}
          </div>
        </div>
        <hr />
        <div>
          <div className="lbl-small">Questions · time</div>
          <div className="stat-row" style={{ marginTop: 4 }}>
            <span className="big lime">{pick.totalQuestions}</span>
            <span className="small">Qs · {duration}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
