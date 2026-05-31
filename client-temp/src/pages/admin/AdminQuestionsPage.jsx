import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Search, HelpCircle, CheckCircle2, FileText, Clock,
  ChevronLeft, ChevronRight, X, Eye, Edit,
} from "lucide-react";
import BrandLoader from "../../components/brand/BrandLoader";
import { questionsAPI } from "../../services/api";
import "./AdminQuestionsPage.css";
import "./AdminTransactionsPage.css";
import "./AdminCodesPage.css";

const STATUS_TABS = [
  { key: "ALL",            label: "All" },
  { key: "PUBLISHED",      label: "Published" },
  { key: "DRAFT",          label: "Draft" },
  { key: "PENDING_REVIEW", label: "Pending" },
  { key: "REJECTED",       label: "Rejected" },
];

const DIFF_TABS = [
  { key: "ALL",    label: "Any" },
  { key: "Easy",   label: "Easy" },
  { key: "Medium", label: "Medium" },
  { key: "Hard",   label: "Hard" },
  { key: "Expert", label: "Expert" },
];

const TYPE_OPTIONS = [
  { value: "ALL",                 label: "Any type" },
  { value: "MCQ",                 label: "MCQ" },
  { value: "MULTI_CORRECT",       label: "Multi-correct" },
  { value: "ASSERTION_REASON",    label: "Assertion-reason" },
  { value: "CASE_BASED",          label: "Case-based" },
  { value: "MATCH_THE_FOLLOWING", label: "Match" },
  { value: "TRUE_FALSE",          label: "True / false" },
  { value: "DIAGRAM_BASED",       label: "Diagram-based" },
];

const PAGE_SIZE = 20;
const unwrap = (res) => res?.data ?? res ?? null;
const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString("en-IN");

const subjectClass = (subj) => {
  const s = (subj || "").toLowerCase();
  if (s.includes("phys")) return "subj-physics";
  if (s.includes("chem")) return "subj-chem";
  if (s.includes("bio")) return "subj-bio";
  if (s.includes("math") || s === "maths") return "subj-math";
  return "";
};

function useDebounced(value, delay) {
  const [v, setV] = useState(value);
  useEffect(() => { const id = setTimeout(() => setV(value), delay); return () => clearTimeout(id); }, [value, delay]);
  return v;
}

export default function AdminQuestionsPage() {
  const [filters, setFilters] = useState(null); // { subjects, chapters, topics, classes, examTypes }
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [difficulty, setDifficulty] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [subject, setSubject] = useState("ALL");
  const [chapter, setChapter] = useState("ALL");
  const [klass, setKlass] = useState("ALL");
  const [examType, setExamType] = useState("ALL");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
  const [statusCounts, setStatusCounts] = useState({ total: 0, published: 0, draft: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);

  /* Filter facets (subjects/classes/etc) — fetched once. */
  useEffect(() => {
    questionsAPI.getFilters()
      .then((res) => setFilters(unwrap(res) || {}))
      .catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [status, difficulty, type, subject, chapter, klass, examType, debouncedSearch]);

  /* Status-tab counts. Three lightweight `count`-only fetches in parallel
     once per filter combo — keeps the tab pills informative without one
     query per tab on every keystroke. */
  const loadStatusCounts = useCallback(async (baseParams) => {
    try {
      const [allRes, pubRes, drftRes, pendRes] = await Promise.all([
        questionsAPI.list({ ...baseParams, limit: 1, page: 1 }),
        questionsAPI.list({ ...baseParams, status: "PUBLISHED", limit: 1, page: 1 }),
        questionsAPI.list({ ...baseParams, status: "DRAFT",     limit: 1, page: 1 }),
        questionsAPI.list({ ...baseParams, status: "PENDING_REVIEW", limit: 1, page: 1 }),
      ]);
      setStatusCounts({
        total:     allRes?.pagination?.total ?? 0,
        published: pubRes?.pagination?.total ?? 0,
        draft:     drftRes?.pagination?.total ?? 0,
        pending:   pendRes?.pagination?.total ?? 0,
      });
    } catch { /* non-fatal */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page, limit: PAGE_SIZE,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(status !== "ALL" ? { status } : {}),
        ...(difficulty !== "ALL" ? { difficulty } : {}),
        ...(type !== "ALL" ? { questionType: type } : {}),
        ...(subject !== "ALL" ? { subject } : {}),
        ...(chapter !== "ALL" ? { chapter } : {}),
        ...(klass !== "ALL" ? { class: klass } : {}),
        ...(examType !== "ALL" ? { examType } : {}),
      };
      const res = await questionsAPI.list(params);
      const payload = unwrap(res);
      setRows(payload?.questions || []);
      setPagination(res?.pagination || { page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
      // Re-roll status counts using the same params MINUS status, so each
      // pill reports its true count within the rest of the filter set.
      const { status: _omit, ...countBase } = params;
      loadStatusCounts(countBase);
    } catch (err) {
      toast.error(err?.message || "Failed to load questions");
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [page, status, difficulty, type, subject, chapter, klass, examType, debouncedSearch, loadStatusCounts]);

  useEffect(() => { load(); }, [load]);

  /* Chapter list narrows by selected subject so the dropdown isn't a wall
     of unrelated chapter names. */
  const chapterOptions = useMemo(() => {
    const all = Array.isArray(filters?.chapters) ? filters.chapters.filter(Boolean) : [];
    return all.sort();
  }, [filters]);
  const subjectOptions = useMemo(
    () => Array.isArray(filters?.subjects) ? filters.subjects.filter(Boolean).sort() : [],
    [filters],
  );
  const classOptions = useMemo(
    () => Array.isArray(filters?.classes) ? filters.classes.filter(Boolean).sort() : [],
    [filters],
  );
  const examOptions = useMemo(
    () => Array.isArray(filters?.examTypes) ? filters.examTypes.filter(Boolean).sort() : [],
    [filters],
  );

  const clearFilters = () => {
    setStatus("ALL"); setDifficulty("ALL"); setType("ALL");
    setSubject("ALL"); setChapter("ALL"); setKlass("ALL"); setExamType("ALL");
    setSearch("");
  };
  const anyFilterOn =
    status !== "ALL" || difficulty !== "ALL" || type !== "ALL" ||
    subject !== "ALL" || chapter !== "ALL" || klass !== "ALL" || examType !== "ALL" ||
    search;

  if (firstLoad && loading) {
    return <div className="admin-main"><BrandLoader /></div>;
  }

  const pagerNumbers = (() => {
    const total = pagination.pages || 1;
    const cur = pagination.page || 1;
    const window = 2;
    const start = Math.max(1, cur - window);
    const end = Math.min(total, cur + window);
    const list = [];
    for (let i = start; i <= end; i++) list.push(i);
    if (start > 1) { list.unshift("…"); list.unshift(1); }
    if (end < total) { list.push("…"); list.push(total); }
    return list;
  })();

  const summaryCards = [
    { lbl: "All questions", v: fmtInt(statusCounts.total),     hint: "matching filters", Icon: HelpCircle },
    { lbl: "Published",     v: fmtInt(statusCounts.published), hint: "live to students", Icon: CheckCircle2 },
    { lbl: "Drafts",        v: fmtInt(statusCounts.draft),     hint: "not yet published", Icon: FileText },
    { lbl: "Pending review", v: fmtInt(statusCounts.pending),  hint: "awaiting approval", Icon: Clock },
  ];

  return (
    <div className="admin-main">
      <div className="page-head">
        <div>
          <div className="crumb">Catalog / Questions</div>
          <h1>Questions</h1>
          <p className="sub">
            The full question bank — narrow by status, type, difficulty, subject, chapter, class, or exam target.
            {pagination.total > 0 && <> Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pagination.total)} of {pagination.total.toLocaleString("en-IN")}.</>}
          </p>
        </div>
      </div>

      <div className="tx-summary">
        {summaryCards.map((c) => (
          <div key={c.lbl} className="tx-stat">
            <span className="lbl">{c.lbl}</span>
            <span className="v">{c.v}</span>
            <span className="hint">{c.hint}</span>
          </div>
        ))}
      </div>

      <div className="tx-table-wrap">
        <div className="tx-filters">
          <div className="tx-search">
            <Search size={14} />
            <input
              type="search"
              placeholder="Search prompts, chapter, or question ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="tx-chip-group">
            {STATUS_TABS.map((t) => (
              <button key={t.key} className={status === t.key ? "on" : ""} onClick={() => setStatus(t.key)}>{t.label}</button>
            ))}
          </div>

          <div className="tx-chip-group">
            {DIFF_TABS.map((t) => (
              <button key={t.key} className={difficulty === t.key ? "on" : ""} onClick={() => setDifficulty(t.key)}>{t.label}</button>
            ))}
          </div>

          {anyFilterOn && (
            <button className="tx-clear-btn" onClick={clearFilters} title="Clear all filters">
              <X size={12} style={{ marginRight: 4, verticalAlign: "-2px" }} />
              Clear
            </button>
          )}
        </div>

        {/* Secondary cascade: subject → chapter, exam, class, type. Lives
            below the chips so it doesn't crowd the chip row. */}
        <div className="tx-filters" style={{ borderTop: "1px solid var(--rr-border)" }}>
          <div className="q-cascade">
            <div className="q-cascade-field">
              <label>Subject</label>
              <select className="q-cascade-select" value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="ALL">All subjects</option>
                {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="q-cascade-field">
              <label>Chapter</label>
              <select className="q-cascade-select" value={chapter} onChange={(e) => setChapter(e.target.value)}>
                <option value="ALL">All chapters</option>
                {chapterOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="q-cascade-field">
              <label>Class</label>
              <select className="q-cascade-select" value={klass} onChange={(e) => setKlass(e.target.value)}>
                <option value="ALL">All classes</option>
                {classOptions.map((c) => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
            <div className="q-cascade-field">
              <label>Exam target</label>
              <select className="q-cascade-select" value={examType} onChange={(e) => setExamType(e.target.value)}>
                <option value="ALL">All exams</option>
                {examOptions.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="q-cascade-field">
              <label>Type</label>
              <select className="q-cascade-select" value={type} onChange={(e) => setType(e.target.value)}>
                {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="tx-empty">
            {anyFilterOn ? "No questions match those filters." : "No questions in the bank yet."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="atable">
              <thead>
                <tr>
                  <th>Prompt</th>
                  <th>Subject</th>
                  <th>Chapter</th>
                  <th>Difficulty</th>
                  <th>Status</th>
                  <th className="right">Marks</th>
                  <th className="right">Time</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <div className="q-prompt">
                        {q.question || "(no prompt)"}
                        <small>{q.questionId} · {q.questionType?.replace(/_/g, " ").toLowerCase()}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`q-tag ${subjectClass(q.subject)}`}>{q.subject || "—"}</span>
                    </td>
                    <td><span className="q-num">{q.chapter || "—"}</span></td>
                    <td><span className={`q-diff ${(q.difficulty || "").toLowerCase()}`}>{q.difficulty || "—"}</span></td>
                    <td><span className={`status-pill ${(q.status || "").toLowerCase()}`}>{q.status}</span></td>
                    <td className="right"><span className="q-num">{q.marks ?? 1}</span></td>
                    <td className="right"><span className="q-num">{q.estimatedTimeSeconds ?? 60}s</span></td>
                    <td className="right">
                      <div className="row-actions">
                        <button className="row-act" title="Preview — coming soon" disabled><Eye size={14} /></button>
                        <button className="row-act" title="Edit — coming soon" disabled><Edit size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="pager-bar">
            <span>Page {pagination.page} of {pagination.pages} · {pagination.total.toLocaleString("en-IN")} total</span>
            <div className="pager">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft size={12} />
              </button>
              {pagerNumbers.map((n, i) =>
                n === "…" ? (
                  <span key={`gap-${i}`} style={{ padding: "0 4px", color: "var(--rr-fg-muted)" }}>…</span>
                ) : (
                  <button key={n} className={n === page ? "on" : ""} onClick={() => setPage(n)}>{n}</button>
                ),
              )}
              <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
