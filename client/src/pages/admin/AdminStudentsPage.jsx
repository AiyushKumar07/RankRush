import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Search, Users, ShieldCheck, UserPlus, Activity,
  ChevronLeft, ChevronRight, X, Eye, Mail,
} from "lucide-react";
import BrandLoader from "../../components/brand/BrandLoader";
import { adminOverviewAPI } from "../../services/api";
import "./AdminStudentsPage.css";
import "./AdminTransactionsPage.css"; // .tx-summary, .tx-filters, .tx-chip-group, .tx-search, .tx-stat
import "./AdminCodesPage.css";        // .atable, .pager-bar, .row-act

const TARGET_TABS = [
  { key: "ALL",    label: "All" },
  { key: "Boards", label: "Boards" },
  { key: "JEE",    label: "JEE" },
  { key: "NEET",   label: "NEET" },
];
const CLASS_TABS = [
  { key: "ALL", label: "All" },
  { key: "8",   label: "C8" },
  { key: "9",   label: "C9" },
  { key: "10",  label: "C10" },
  { key: "11",  label: "C11" },
  { key: "12",  label: "C12" },
];
const STATUS_TABS = [
  { key: "ALL",      label: "All" },
  { key: "active",   label: "Active" },
  { key: "inactive", label: "Inactive" },
];

const PAGE_SIZE = 20;
const unwrap = (res) => res?.data ?? res ?? null;

const initials = (name) =>
  (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();

const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString("en-IN");

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
const fmtRelative = (d) => {
  if (!d) return "Never";
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

function useDebounced(value, delay) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function AdminStudentsPage() {
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState("ALL");
  const [klass, setKlass] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const debouncedSearch = useDebounced(search, 300);

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ total: 0, active: 0, verified: 0, newToday: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);

  useEffect(() => { setPage(1); }, [target, klass, status, debouncedSearch, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page, limit: PAGE_SIZE,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(target !== "ALL" ? { target } : {}),
        ...(klass !== "ALL" ? { class: klass } : {}),
        ...(status !== "ALL" ? { isActive: status === "active" ? "true" : "false" } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      };
      const res = await adminOverviewAPI.listStudents(params);
      const payload = unwrap(res);
      setRows(payload?.rows || []);
      setTotals(payload?.totals || { total: 0, active: 0, verified: 0, newToday: 0 });
      setPagination(res?.pagination || { page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
    } catch (err) {
      toast.error(err?.message || "Failed to load students");
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [page, target, klass, status, debouncedSearch, from, to]);

  useEffect(() => { load(); }, [load]);

  const clearFilters = () => {
    setTarget("ALL"); setKlass("ALL"); setStatus("ALL"); setSearch(""); setFrom(""); setTo("");
  };
  const anyFilterOn = target !== "ALL" || klass !== "ALL" || status !== "ALL" || search || from || to;

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
    { lbl: "Total students", v: fmtInt(totals.total),    hint: "lifetime",          Icon: Users },
    { lbl: "Active",         v: fmtInt(totals.active),   hint: "last 14 days",      Icon: Activity },
    { lbl: "Verified",       v: fmtInt(totals.verified), hint: "email confirmed",   Icon: ShieldCheck },
    { lbl: "New today",      v: fmtInt(totals.newToday), hint: "signed up today",   Icon: UserPlus },
  ];

  return (
    <div className="admin-main">
      <div className="page-head">
        <div>
          <div className="crumb">Students / All</div>
          <h1>All students</h1>
          <p className="sub">
            Every account on the platform — searchable and filterable by cohort, class, and status.
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
              placeholder="Search by name, email, or username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="tx-chip-group">
            {TARGET_TABS.map((t) => (
              <button key={t.key} className={target === t.key ? "on" : ""} onClick={() => setTarget(t.key)}>{t.label}</button>
            ))}
          </div>

          <div className="tx-chip-group">
            {CLASS_TABS.map((t) => (
              <button key={t.key} className={klass === t.key ? "on" : ""} onClick={() => setKlass(t.key)}>{t.label}</button>
            ))}
          </div>

          <div className="tx-chip-group">
            {STATUS_TABS.map((t) => (
              <button key={t.key} className={status === t.key ? "on" : ""} onClick={() => setStatus(t.key)}>{t.label}</button>
            ))}
          </div>

          <div className="tx-date-row">
            <span>Joined</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} max={to || undefined} />
            <span>to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} min={from || undefined} />
          </div>

          {anyFilterOn && (
            <button className="tx-clear-btn" onClick={clearFilters} title="Clear all filters">
              <X size={12} style={{ marginRight: 4, verticalAlign: "-2px" }} />
              Clear
            </button>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="tx-empty">
            {anyFilterOn ? "No students match those filters." : "No students yet."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="atable">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Cohort</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Streak</th>
                  <th>Quizzes</th>
                  <th>Tokens</th>
                  <th>Joined</th>
                  <th>Last seen</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const cohort = [(s.target && s.target[0]) || "—", s.class ? `C${s.class}` : null].filter(Boolean).join(" · ");
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="st-user">
                          <span className="st-avatar">{initials(s.name)}</span>
                          <div className="meta">
                            <span className="name">{s.name || "—"}</span>
                            <span className="email">{s.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="st-cohort">
                          <span className="pip">{cohort || "—"}</span>
                          {s.board ? <span style={{ color: "var(--rr-fg-muted)" }}>· {s.board}</span> : null}
                        </span>
                      </td>
                      <td>
                        <span className={`st-plan-pill ${s.plan !== "Free" ? "paid" : ""}`}>
                          {s.plan}{s.cadence ? ` · ${s.cadence.toLowerCase()}` : ""}
                        </span>
                      </td>
                      <td>
                        <span className="st-flag-strip">
                          <span className={`st-flag ${s.isActive ? "ok" : "bad"}`}>{s.isActive ? "Active" : "Inactive"}</span>
                          <span className={`st-flag ${s.isVerified ? "ok" : "warn"}`}>{s.isVerified ? "Verified" : "Unverified"}</span>
                        </span>
                      </td>
                      <td><span className="st-num">{s.streak}<small>d</small></span></td>
                      <td><span className="st-num">{fmtInt(s.quizzesCompleted)}</span></td>
                      <td><span className="st-num">{fmtInt(s.tokenBalance)}</span></td>
                      <td><span className="st-date">{fmtDate(s.createdAt)}</span></td>
                      <td><span className="st-date">{fmtRelative(s.lastActive || s.lastLogin)}</span></td>
                      <td className="right">
                        <div className="row-actions">
                          <button className="row-act" title="View profile — coming soon" disabled><Eye size={14} /></button>
                          <a className="row-act" title={`Email ${s.email}`} href={`mailto:${s.email}`}><Mail size={14} /></a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
