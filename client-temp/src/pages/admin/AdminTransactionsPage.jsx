import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Search, Receipt, TrendingUp, AlertCircle, RotateCcw,
  ChevronLeft, ChevronRight, X,
} from "lucide-react";
import BrandLoader from "../../components/brand/BrandLoader";
import { adminOverviewAPI } from "../../services/api";
import "./AdminTransactionsPage.css";
import "./AdminCodesPage.css"; // .atable, .status-pill, .pager — reused

const STATUS_TABS = [
  { key: "ALL",      label: "All" },
  { key: "SUCCESS",  label: "Success" },
  { key: "PENDING",  label: "Pending" },
  { key: "FAILED",   label: "Failed" },
  { key: "REFUNDED", label: "Refunded" },
];

const MODE_TABS = [
  { key: "ALL",          label: "All" },
  { key: "SUBSCRIPTION", label: "Subscription" },
  { key: "ONE_TIME",     label: "One-time" },
];

const PAGE_SIZE = 20;

const unwrap = (res) => res?.data ?? res ?? null;

const fmtMoney = (amount, currency = "INR") => {
  const v = Math.round(Number(amount) || 0);
  if (currency === "INR") return `₹${v.toLocaleString("en-IN")}`;
  return `${currency} ${v.toLocaleString("en-IN")}`;
};

const fmtDateTime = (d) => {
  const date = new Date(d);
  return {
    main: date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    time: date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
};

const cadenceLabel = (c) => {
  if (c === "MONTHLY") return "monthly";
  if (c === "ANNUAL") return "annual";
  if (c === "ONE_TIME") return "one-time";
  return "—";
};

// Debounce search input so we don't fire a query on every keystroke.
function useDebounced(value, delay) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function AdminTransactionsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [mode, setMode] = useState("ALL");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const debouncedSearch = useDebounced(search, 300);

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ gross: 0, net: 0, success: 0, failed: 0, refunded: 0, pending: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);

  // Any filter change drops back to page 1 — keeps the user from staring at
  // an empty page 7 after they tighten a filter.
  useEffect(() => { setPage(1); }, [status, mode, debouncedSearch, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Server returns `{ data: { rows, totals }, pagination: {...} }`.
      // The axios interceptor strips the HTTP envelope, so what we get
      // here IS that object — `data` and `pagination` live side-by-side.
      const res = await adminOverviewAPI.listTransactions({
        page, limit: PAGE_SIZE,
        status, mode,
        search: debouncedSearch || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      const payload = unwrap(res);
      setRows(payload?.rows || []);
      setTotals(payload?.totals || { gross: 0, net: 0, success: 0, failed: 0, refunded: 0, pending: 0 });
      setPagination(res?.pagination || { page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
    } catch (err) {
      toast.error(err?.message || "Failed to load transactions");
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [page, status, mode, debouncedSearch, from, to]);

  useEffect(() => { load(); }, [load]);

  const summaryCards = useMemo(() => ([
    { lbl: "Gross revenue",   v: fmtMoney(totals.gross),   tone: "pos",     hint: `${totals.success || 0} successful`, Icon: TrendingUp },
    { lbl: "Net (after refunds)", v: fmtMoney(totals.net), tone: "pos",     hint: `${totals.refunded || 0} refunded`, Icon: Receipt },
    { lbl: "Failed",          v: String(totals.failed || 0), tone: "neg",   hint: "needs follow-up", Icon: AlertCircle },
    { lbl: "Pending",         v: String(totals.pending || 0), tone: "",     hint: "awaiting verify", Icon: RotateCcw },
  ]), [totals]);

  const clearFilters = () => {
    setStatus("ALL"); setMode("ALL"); setSearch(""); setFrom(""); setTo("");
  };

  const anyFilterOn = status !== "ALL" || mode !== "ALL" || search || from || to;

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

  return (
    <div className="admin-main">
      {/* Page header */}
      <div className="page-head">
        <div>
          <div className="crumb">/ Overview · Transactions</div>
          <h1>Transactions</h1>
          <p className="sub">
            All payments — who spent what, when, and for which plan.{" "}
            {pagination.total > 0 && <>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pagination.total)} of {pagination.total.toLocaleString("en-IN")}.</>}
          </p>
        </div>
      </div>

      {/* Totals — only reflect the current filter, so users can scope to a
          date range and see the gross for that range without a second click. */}
      <div className="tx-summary">
        {summaryCards.map((c) => (
          <div key={c.lbl} className="tx-stat">
            <span className="lbl">{c.lbl}</span>
            <span className={`v ${c.tone}`}>{c.v}</span>
            <span className="hint">{c.hint}</span>
          </div>
        ))}
      </div>

      {/* Filter bar + table — wrapped in a single card so filters feel
          attached to the data they constrain. */}
      <div className="tx-table-wrap">
        <div className="tx-filters">
          <div className="tx-search">
            <Search size={14} />
            <input
              type="search"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="tx-chip-group">
            {STATUS_TABS.map((t) => (
              <button key={t.key} className={status === t.key ? "on" : ""} onClick={() => setStatus(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="tx-chip-group">
            {MODE_TABS.map((t) => (
              <button key={t.key} className={mode === t.key ? "on" : ""} onClick={() => setMode(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="tx-date-row">
            <span>From</span>
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
            {anyFilterOn ? "No transactions match those filters." : "No transactions yet — once a student pays, it'll appear here."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="atable">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Plan</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Gateway ID</th>
                  <th className="right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const d = fmtDateTime(r.createdAt);
                  const statusClass = r.status.toLowerCase();
                  const amountClass = r.status === "REFUNDED" ? "refunded" : r.status === "PENDING" ? "pending" : "";
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="tx-date">
                          {d.main}
                          <small>{d.time}</small>
                        </div>
                      </td>
                      <td>
                        <div className="tx-user">
                          <span className="name">{r.user?.name || "Unknown"}</span>
                          <span className="email">{r.user?.email || "—"}</span>
                        </div>
                      </td>
                      <td>
                        <div className="tx-plan">
                          <span className="name">{r.planName}</span>
                          <span className="cadence">{cadenceLabel(r.cadence)}{r.redeemCode ? ` · code ${r.redeemCode}` : ""}</span>
                        </div>
                      </td>
                      <td>
                        <span className="tx-gateway-id">{r.mode === "SUBSCRIPTION" ? "Subscription" : "One-time"}</span>
                      </td>
                      <td>
                        <span className={`status-pill ${statusClass}`}>{r.status}</span>
                      </td>
                      <td>
                        <span className="tx-gateway-id" title={r.gatewayPaymentId || r.gatewayOrderId || ""}>
                          {(r.gatewayPaymentId || r.gatewayOrderId || "—").slice(0, 16)}
                          {(r.gatewayPaymentId || r.gatewayOrderId || "").length > 16 ? "…" : ""}
                        </span>
                      </td>
                      <td className="right">
                        <span className={`tx-amount ${amountClass}`}>
                          {r.status === "REFUNDED" ? "−" : ""}{fmtMoney(r.amount, r.currency)}
                        </span>
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
            <span>
              Page {pagination.page} of {pagination.pages} · {pagination.total.toLocaleString("en-IN")} total
            </span>
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
