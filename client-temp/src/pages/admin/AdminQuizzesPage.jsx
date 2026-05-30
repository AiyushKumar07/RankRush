import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Upload, Download, Plus, Eye, EyeOff, Archive, Copy, Trash2, X,
  Edit, MoreHorizontal, ArrowLeft, ArrowRight, Info, Trophy, Loader2,
  Calendar, Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import { quizzesAPI } from "../../services/api";
import Modal from "../../components/ui/Modal";
import "./AdminQuizzesPage.css";

const SUBJECT_FILTERS = ["All", "Mathematics", "Physics", "Chemistry", "Biology", "Mixed"];
const STATUS_FILTERS = ["All", "ACTIVE", "DRAFT", "ARCHIVED"];
const DIFF_FILTERS = ["Any", "EASY", "MEDIUM", "HARD"];

const SUBJECT_COLOR = {
  Mathematics: "var(--rr-violet-500)",
  Maths:       "var(--rr-violet-500)",
  Physics:     "var(--rr-cyan-500)",
  Chemistry:   "var(--rr-amber-500)",
  Biology:     "var(--rr-emerald-500)",
  Mixed:       "linear-gradient(90deg, var(--rr-violet-500), var(--rr-cyan-500))",
};
const SUBJECT_DIFF_CLASS = {
  Physics:   "physics",
  Chemistry: "chem",
  Biology:   "bio",
};

const STATUS_LABEL = { ACTIVE: "Published", DRAFT: "Draft", ARCHIVED: "Archived" };
const STATUS_CLASS = { ACTIVE: "published",  DRAFT: "draft", ARCHIVED: "archived" };

function unwrap(res) { return res?.data ?? res ?? null; }

// Difficulty string → "filled-pip" count out of 5, matching the existing
// .diff-mini visual. EASY=2, MEDIUM=3, HARD=4.
function diffPips(difficulty) {
  const map = { EASY: 2, MEDIUM: 3, HARD: 4 };
  const filled = map[(difficulty || "").toUpperCase()] ?? 0;
  return [0, 1, 2, 3, 4].map((i) => (i < filled ? 1 : 0));
}

// Contest phase derived from (rankRewarding, isClosed, quizStartsAt, quizEndsAt).
// Returns { label, tone } so the UI can render a consistent pill.
function phaseOf(q, now = new Date()) {
  if (!q.rankRewarding) return { label: "Practice", tone: "neutral" };
  if (q.isClosed) return { label: "Closed", tone: "closed" };
  const start = q.quizStartsAt ? new Date(q.quizStartsAt) : null;
  const end = q.quizEndsAt ? new Date(q.quizEndsAt) : null;
  if (start && start > now) return { label: "Upcoming", tone: "upcoming" };
  if (end && end < now) return { label: "Closing…", tone: "closing" }; // past end but cron hasn't run yet
  return { label: "Live", tone: "live" };
}

// Renders a window range compactly. Format trims year + seconds for table fit.
function fmtWindow(startIso, endIso) {
  const fmt = (iso) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
    });
  };
  const s = fmt(startIso);
  const e = fmt(endIso);
  if (!s && !e) return "—";
  return `${s ?? "anytime"} → ${e ?? "no end"}`;
}

// datetime-local needs YYYY-MM-DDTHH:mm (no Z, local time). Convert from ISO
// → local-input-friendly string.
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function timeAgo(value) {
  if (!value) return "—";
  const d = new Date(value);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [subject, setSubject] = useState("All");
  const [status, setStatus] = useState("All");
  const [difficulty, setDifficulty] = useState("Any");
  const [page, setPage] = useState(1);
  const [togglingId, setTogglingId] = useState(null);
  const [closingId, setClosingId] = useState(null);
  const [windowModal, setWindowModal] = useState(null); // quiz row being edited

  const params = useMemo(() => {
    const p = { page, limit: 20 };
    if (subject !== "All") p.subject = subject;
    if (status !== "All") p.status = status;
    return p;
  }, [page, subject, status]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await quizzesAPI.getAll(params);
      const data = unwrap(res);
      let rows = data?.quizzes ?? [];
      // Difficulty isn't a server-side filter today; do it client-side so
      // the filter chip still works on the visible page.
      if (difficulty !== "Any") {
        rows = rows.filter((q) => (q.difficulty || "").toUpperCase() === difficulty);
      }
      setQuizzes(rows);
      setPagination(res?.pagination ?? { total: rows.length, page, pages: 1 });
    } catch (err) {
      toast.error(err?.message || "Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  }, [params, difficulty, page]);

  useEffect(() => { load(); }, [load]);

  const handleSaveWindow = async ({ id, quizStartsAt, quizEndsAt }) => {
    try {
      await quizzesAPI.setWindow(id, {
        quizStartsAt: quizStartsAt ? new Date(quizStartsAt).toISOString() : null,
        quizEndsAt: quizEndsAt ? new Date(quizEndsAt).toISOString() : null,
      });
      setQuizzes((prev) => prev.map((q) => (
        q.id === id
          ? { ...q, quizStartsAt: quizStartsAt || null, quizEndsAt: quizEndsAt || null }
          : q
      )));
      setWindowModal(null);
      toast.success("Contest window updated");
    } catch (err) {
      toast.error(err?.message || "Failed to update window");
    }
  };

  const handleClose = async (quiz) => {
    if (!confirm(`Close the "${quiz.title}" leaderboard now? This is irreversible — ranks will be locked.`)) return;
    setClosingId(quiz.id);
    try {
      await quizzesAPI.closeLeaderboard(quiz.id);
      setQuizzes((prev) => prev.map((q) => (
        q.id === quiz.id ? { ...q, isClosed: true, closedAt: new Date().toISOString() } : q
      )));
      toast.success("Leaderboard closed · global ranks recomputing");
    } catch (err) {
      toast.error(err?.message || "Close failed");
    } finally {
      setClosingId(null);
    }
  };

  const handleToggleRank = async (quiz) => {
    const nextValue = !quiz.rankRewarding;
    setTogglingId(quiz.id);
    // Optimistic update so the switch feels instant.
    setQuizzes((prev) => prev.map((q) => (q.id === quiz.id ? { ...q, rankRewarding: nextValue } : q)));
    try {
      await quizzesAPI.setRankRewarding(quiz.id, nextValue);
      toast.success(nextValue
        ? `"${quiz.title}" now counts toward rank`
        : `"${quiz.title}" removed from rank scoring`);
    } catch (err) {
      // Roll back on failure.
      setQuizzes((prev) => prev.map((q) => (q.id === quiz.id ? { ...q, rankRewarding: !nextValue } : q)));
      toast.error(err?.message || "Toggle failed");
    } finally {
      setTogglingId(null);
    }
  };

  const toggleAll = () => {
    if (selected.size === quizzes.length) setSelected(new Set());
    else setSelected(new Set(quizzes.map((q) => q.id)));
  };
  const toggleRow = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const allChecked = quizzes.length > 0 && selected.size === quizzes.length;
  const startIdx = (pagination.page - 1) * 20 + 1;
  const endIdx = Math.min(pagination.total, startIdx + quizzes.length - 1);

  return (
    <div className="admin-main">
      {/* Page header */}
      <div className="page-head">
        <div>
          <div className="crumb">Catalog / Quizzes</div>
          <h1>Quizzes</h1>
          <p className="sub">
            {pagination.total} {pagination.total === 1 ? "quiz" : "quizzes"}
            {quizzes.length > 0 && ` · viewing ${startIdx}–${endIdx}`}
          </p>
        </div>
        <div className="head-actions">
          <button className="btn btn-secondary btn-sm" disabled><Upload size={12} />Import CSV</button>
          <button className="btn btn-secondary btn-sm" disabled><Download size={12} />Export</button>
          <button className="btn btn-accent btn-sm" disabled><Plus size={12} />New quiz</button>
        </div>
      </div>

      {/* Stat strip — counts derived from current filter; rank-rewarding count
          is computed client-side from the visible page only. */}
      <StatStrip total={pagination.total} quizzes={quizzes} />

      {/* Filter bar */}
      <div className="afilter">
        <span className="lbl">Subject</span>
        {SUBJECT_FILTERS.map((s) => (
          <button key={s} className={`chip${subject === s ? " on" : ""}`} onClick={() => { setSubject(s); setPage(1); }}>{s}</button>
        ))}
        <span className="divider" />
        <span className="lbl">Status</span>
        {STATUS_FILTERS.map((s) => (
          <button key={s} className={`chip${status === s ? " on" : ""}`} onClick={() => { setStatus(s); setPage(1); }}>
            {s === "All" ? s : STATUS_LABEL[s] ?? s}
          </button>
        ))}
        <span className="divider" />
        <span className="lbl">Difficulty</span>
        {DIFF_FILTERS.map((d) => (
          <button key={d} className={`chip${difficulty === d ? " on" : ""}`} onClick={() => setDifficulty(d)}>
            {d === "Any" ? d : d[0] + d.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bulk-bar">
          <span className="count">{selected.size} selected</span>
          <span style={{ opacity: 0.7, fontFamily: "var(--rr-font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>Bulk actions</span>
          <div className="ctrls">
            <button className="bulk-btn" disabled><Eye size={13} />Publish</button>
            <button className="bulk-btn" disabled><EyeOff size={13} />Unpublish</button>
            <button className="bulk-btn" disabled><Archive size={13} />Archive</button>
            <button className="bulk-btn" disabled><Copy size={13} />Duplicate</button>
            <button className="bulk-btn danger" disabled><Trash2 size={13} />Delete</button>
            <button className="bulk-btn" onClick={() => setSelected(new Set())} style={{ marginLeft: 8, border: 0 }}><X size={13} /></button>
          </div>
        </div>
      )}

      {/* Quiz table */}
      <div className="acard">
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--rr-fg-muted)" }}>
            <Loader2 size={20} className="aq-spin" /> Loading quizzes…
          </div>
        ) : quizzes.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--rr-fg-muted)" }}>
            No quizzes match these filters.
          </div>
        ) : (
          <table className="atable">
            <thead>
              <tr>
                <th style={{ width: 36, paddingLeft: 22 }}>
                  <div className={`check${allChecked ? " on" : ""}`} onClick={toggleAll} />
                </th>
                <th style={{ minWidth: 240 }}>Quiz</th>
                <th className="opt-md">Difficulty</th>
                <th style={{ width: 120 }}>
                  <span title="Toggle on to make this quiz contribute to global rank scoring and unlock its per-quiz leaderboard.">
                    Rank-rewarding
                  </span>
                </th>
                <th style={{ width: 100 }}>Phase</th>
                <th style={{ width: 220 }}>Contest window</th>
                <th style={{ width: 100 }}>Status</th>
                <th className="opt-md" style={{ width: 110 }}>Last edited</th>
                <th className="right" style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((q) => {
                const color = SUBJECT_COLOR[q.subject] || "var(--rr-fg-muted)";
                const diffClass = SUBJECT_DIFF_CLASS[q.subject] || "";
                const subTitle = [
                  q.subject,
                  q.chapter || q.topic,
                  `${q.totalQuestions} Qs`,
                  `${Math.round(q.timeLimitMins)} min`,
                ].filter(Boolean).join(" · ");
                return (
                  <tr key={q.id}>
                    <td>
                      <div className={`check${selected.has(q.id) ? " on" : ""}`} onClick={() => toggleRow(q.id)} />
                    </td>
                    <td>
                      <div className="subj-cell">
                        <span className="d" style={{ background: color }} />
                        <div>
                          <span className="name">{q.title}</span>
                          <span className="topic">{subTitle}</span>
                        </div>
                      </div>
                    </td>
                    <td className="opt-md">
                      <div className={`diff-mini ${diffClass}`}>
                        {diffPips(q.difficulty).map((on, j) => (
                          <span key={j} className={`p${on ? " on" : ""}`} />
                        ))}
                      </div>
                    </td>
                    <td>
                      <RankSwitch
                        on={q.rankRewarding === true}
                        busy={togglingId === q.id}
                        onClick={() => handleToggleRank(q)}
                      />
                    </td>
                    <td>
                      {(() => {
                        const phase = phaseOf(q);
                        return <span className={`aq-phase aq-phase-${phase.tone}`}>{phase.label}</span>;
                      })()}
                    </td>
                    <td>
                      <button
                        className="aq-window-btn"
                        onClick={() => setWindowModal(q)}
                        disabled={!q.rankRewarding}
                        title={q.rankRewarding ? "Edit start/end dates" : "Enable Rank-rewarding to set a contest window"}
                      >
                        <Calendar size={12} />
                        {fmtWindow(q.quizStartsAt, q.quizEndsAt)}
                      </button>
                    </td>
                    <td><span className={`status-pill ${STATUS_CLASS[q.status] || "draft"}`}>{STATUS_LABEL[q.status] || q.status}</span></td>
                    <td className="opt-md">{timeAgo(q.updatedAt)}</td>
                    <td className="right">
                      <div className="row-actions">
                        {q.rankRewarding && !q.isClosed && (
                          <button
                            className="row-act danger"
                            title="Close leaderboard now (lock ranks, fold into global rank)"
                            onClick={() => handleClose(q)}
                            disabled={closingId === q.id}
                          >
                            {closingId === q.id ? <Loader2 size={14} className="aq-spin" /> : <Lock size={14} />}
                          </button>
                        )}
                        <button className="row-act" title="View" disabled><Eye size={14} /></button>
                        <button className="row-act" title="Edit" disabled><Edit size={14} /></button>
                        <button className="row-act" title="More" disabled><MoreHorizontal size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!loading && pagination.pages > 1 && (
          <div className="pager-bar">
            <span>Showing <b style={{ color: "var(--rr-fg)" }}>{startIdx}–{endIdx}</b> of {pagination.total} quizzes</span>
            <div className="pager">
              <button title="Previous" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <ArrowLeft size={12} />
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => i + 1).map((p) => (
                <button key={p} className={page === p ? "on" : ""} onClick={() => setPage(p)}>{p}</button>
              ))}
              {pagination.pages > 5 && (
                <>
                  <span style={{ display: "inline-flex", alignItems: "center", color: "var(--rr-fg-dim)", padding: "0 4px" }}>…</span>
                  <button onClick={() => setPage(pagination.pages)}>{pagination.pages}</button>
                </>
              )}
              <button title="Next" onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="drawer-stub-card">
        <Info size={16} style={{ color: "var(--rr-violet-500)", flexShrink: 0 }} />
        <span>
          <b style={{ color: "var(--rr-fg)" }}>Rank-rewarding</b> + <b style={{ color: "var(--rr-fg)" }}>Contest window</b> control the leaderboard lifecycle.
          Set an end date and the leaderboard auto-closes; the locked best-percentages then fold into every attempter's global rank.
          Use <b style={{ color: "var(--rr-fg)" }}>Close now</b> to lock the board immediately regardless of end date.
        </span>
      </div>

      <WindowModal
        quiz={windowModal}
        onClose={() => setWindowModal(null)}
        onSave={handleSaveWindow}
      />
    </div>
  );
}

function WindowModal({ quiz, onClose, onSave }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!quiz) return;
    setStart(toLocalInput(quiz.quizStartsAt));
    setEnd(toLocalInput(quiz.quizEndsAt));
  }, [quiz]);

  if (!quiz) return null;

  const submit = async () => {
    if (end && start && new Date(end) <= new Date(start)) {
      toast.error("End must be after start");
      return;
    }
    setSaving(true);
    try {
      await onSave({ id: quiz.id, quizStartsAt: start || null, quizEndsAt: end || null });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!quiz}
      onClose={onClose}
      title={`Contest window · ${quiz.title}`}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" onClick={submit} disabled={saving}>
            {saving ? <Loader2 size={14} className="aq-spin" /> : null}
            Save window
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 16 }}>
        <p style={{ fontSize: 13, color: "var(--rr-fg-muted)", margin: 0 }}>
          Both fields are optional. Leave end-date empty to keep the leaderboard open indefinitely (you can close it manually later). When the end-date passes, the cron auto-closes the leaderboard within 5 minutes.
        </p>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12, color: "var(--rr-fg-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Starts at</label>
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            style={{
              background: "var(--rr-bg)",
              border: "1px solid var(--rr-border)",
              borderRadius: "var(--rr-r-md)",
              padding: "10px 12px",
              color: "var(--rr-fg)",
              font: "inherit",
            }}
          />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12, color: "var(--rr-fg-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Ends at</label>
          <input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            style={{
              background: "var(--rr-bg)",
              border: "1px solid var(--rr-border)",
              borderRadius: "var(--rr-r-md)",
              padding: "10px 12px",
              color: "var(--rr-fg)",
              font: "inherit",
            }}
          />
        </div>
      </div>
    </Modal>
  );
}

function StatStrip({ total, quizzes }) {
  const onPage = quizzes.length;
  const rankRewarding = quizzes.filter((q) => q.rankRewarding).length;
  const drafts = quizzes.filter((q) => q.status === "DRAFT").length;
  return (
    <div className="stat-strip">
      <div className="cell">
        <div className="lbl">Total quizzes</div>
        <div className="v">{total}</div>
      </div>
      <div className="cell">
        <div className="lbl">On this page</div>
        <div className="v">{onPage}</div>
      </div>
      <div className="cell">
        <div className="lbl">Rank-rewarding</div>
        <div className="v">{rankRewarding}<small> on page</small></div>
      </div>
      <div className="cell">
        <div className="lbl">Drafts</div>
        <div className="v">{drafts}<small> on page</small></div>
      </div>
    </div>
  );
}

// Pure-CSS pill switch — no extra dependency. The .aq-switch styles ship
// inline at the bottom of AdminQuizzesPage.css.
function RankSwitch({ on, busy, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`aq-switch${on ? " on" : ""}${busy ? " busy" : ""}`}
      title={on ? "Counts toward rank · click to disable" : "Practice-only · click to enable rank scoring"}
      aria-pressed={on}
    >
      <span className="aq-switch-track">
        <span className="aq-switch-thumb" />
      </span>
      <span className="aq-switch-label">
        {busy ? <Loader2 size={11} className="aq-spin" /> : on ? <Trophy size={11} /> : null}
        {on ? "On" : "Off"}
      </span>
    </button>
  );
}
