import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Ticket, CircleCheck, Percent, TrendingUp,
  Download, Plus, Zap, Copy, Edit, MoreHorizontal, Power, RotateCw,
} from "lucide-react";
import Modal from "../../components/ui/Modal";
import { paymentsAPI, subscriptionPlansAPI } from "../../services/api";
import "./AdminCodesPage.css";

const STATUS_FILTERS = ["All", "Active", "Inactive", "Expired", "Exhausted"];

function randomCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const N = "23456789";
  const r = (s, n) => Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join("");
  return `RR-${r(A, 1)}${r(N, 1)}${r(A, 1)}${r(N, 1)}-${r(A, 2)}${r(N, 2)}`;
}

function deriveStatus(code) {
  if (!code.isActive) return "Inactive";
  if (code.expiresAt && new Date(code.expiresAt) < new Date()) return "Expired";
  if (code.currentUses >= code.maxUses) return "Exhausted";
  return "Active";
}

function formatDate(value) {
  if (!value) return "No expiry";
  const d = new Date(value);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy") ? resolve() : reject();
    } catch (e) { reject(e); }
    document.body.removeChild(ta);
  });
}

export default function AdminCodesPage() {
  const [codes, setCodes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [codesRes, plansRes] = await Promise.all([
        paymentsAPI.getAllRedeemCodes(),
        subscriptionPlansAPI.getAll(),
      ]);
      setCodes(Array.isArray(codesRes) ? codesRes : (codesRes?.data ?? []));
      setPlans(Array.isArray(plansRes) ? plansRes : (plansRes?.data ?? []));
    } catch (err) {
      toast.error(err?.message || "Failed to load codes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const planById = useMemo(() => {
    const map = new Map();
    plans.forEach((p) => map.set(p.id, p));
    return map;
  }, [plans]);

  const stats = useMemo(() => {
    const active = codes.filter((c) => deriveStatus(c) === "Active");
    const totalRedemptions = codes.reduce((s, c) => s + (c.currentUses || 0), 0);
    const avgDiscount = active.length
      ? Math.round(active.reduce((s, c) => s + c.discountPercentage, 0) / active.length)
      : 0;
    return {
      activeCount: active.length,
      totalRedemptions,
      avgDiscount,
      totalCodes: codes.length,
    };
  }, [codes]);

  const filteredCodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return codes
      .filter((c) => {
        if (statusFilter !== "All" && deriveStatus(c) !== statusFilter) return false;
        if (q && !c.code.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [codes, statusFilter, search]);

  const handleCopy = async (code) => {
    try {
      await copyToClipboard(code);
      toast.success(`Copied "${code}"`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleToggle = async (code) => {
    try {
      await paymentsAPI.toggleRedeemCodeStatus(code.id, !code.isActive);
      toast.success(`${code.code} ${code.isActive ? "paused" : "activated"}`);
      loadAll();
    } catch (err) {
      toast.error(err?.message || "Failed to toggle code");
    }
  };

  const handleCreate = async (payload) => {
    try {
      await paymentsAPI.createRedeemCode(payload);
      toast.success(`Code ${payload.code} created`);
      setModalOpen(false);
      loadAll();
    } catch (err) {
      toast.error(err?.message || "Failed to create code");
    }
  };

  return (
    <div className="admin-main">
      <div className="page-head">
        <div>
          <div className="crumb">Monetisation / Redeem codes</div>
          <h1>Redeem codes</h1>
          <p className="sub">
            {loading
              ? "Loading…"
              : `${stats.activeCount} active code${stats.activeCount === 1 ? "" : "s"} · ${stats.totalRedemptions} redemption${stats.totalRedemptions === 1 ? "" : "s"} so far.`}
          </p>
        </div>
        <div className="head-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(filteredCodes, planById)} disabled={filteredCodes.length === 0}>
            <Download size={12} />Export
          </button>
          <button className="btn btn-accent btn-sm" onClick={() => setModalOpen(true)}>
            <Plus size={12} />New code
          </button>
        </div>
      </div>

      <div className="stat-strip">
        <div className="cell">
          <div className="lbl"><Ticket size={12} />Active codes</div>
          <div className="v">{stats.activeCount}</div>
          <span className="delta">of {stats.totalCodes} total</span>
        </div>
        <div className="cell">
          <div className="lbl"><CircleCheck size={12} />Total redemptions</div>
          <div className="v">{stats.totalRedemptions}</div>
          <span className="delta">across all codes</span>
        </div>
        <div className="cell">
          <div className="lbl"><Percent size={12} />Avg discount</div>
          <div className="v">{stats.avgDiscount}<small>%</small></div>
          <span className="delta">on active codes</span>
        </div>
        <div className="cell">
          <div className="lbl"><TrendingUp size={12} />Plans</div>
          <div className="v">{plans.length}</div>
          <span className="delta">available to target</span>
        </div>
      </div>

      <div className="filter-row-2">
        <span className="gl">Status</span>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            className={`chip${statusFilter === f ? " on" : ""}`}
            onClick={() => setStatusFilter(f)}
          >
            {f}
          </button>
        ))}
        <div className="right">
          <input
            className="search-mini"
            placeholder="Search by code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="acard">
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--rr-fg-muted)" }}>Loading codes…</div>
        ) : filteredCodes.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--rr-fg-muted)" }}>
            <Ticket size={28} style={{ opacity: 0.4 }} />
            <p style={{ marginTop: 12, fontSize: 13 }}>
              {codes.length === 0 ? "No codes yet — create your first one." : "No codes match the filters."}
            </p>
          </div>
        ) : (
          <table className="atable">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Applies to</th>
                <th>Usage</th>
                <th>Expires</th>
                <th>Status</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCodes.map((c) => {
                const status = deriveStatus(c);
                const statusClass = status === "Active" ? "published" : status === "Inactive" ? "draft" : "expired";
                const pct = c.maxUses ? Math.min(100, Math.round((c.currentUses / c.maxUses) * 100)) : 0;
                const barClass = pct >= 100 ? "full" : pct >= 80 ? "warn" : "";
                const planNames = c.applicablePlanIds?.length
                  ? c.applicablePlanIds.map((id) => planById.get(id)?.name || "—").join(", ")
                  : "All plans";
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="code-cell">
                        <span className="code-tag">{c.code}</span>
                        <button className="copy-btn" title="Copy" onClick={() => handleCopy(c.code)}>
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className="type-tag discount">
                        <Percent size={12} />
                        {c.discountPercentage}% off
                      </span>
                    </td>
                    <td>
                      <div className="reward">
                        {planNames}
                      </div>
                    </td>
                    <td>
                      <div className="uses-cell">
                        <div className="uses-top">
                          <span>{c.currentUses} / {c.maxUses}</span>
                          <b>{pct}%</b>
                        </div>
                        <div className="uses-bar">
                          <div className={`fill ${barClass}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td><span className="expires">{formatDate(c.expiresAt)}</span></td>
                    <td><span className={`status-pill ${statusClass}`}>{status}</span></td>
                    <td className="right">
                      <div className="row-actions">
                        <button className="row-act" title={c.isActive ? "Pause" : "Activate"} onClick={() => handleToggle(c)}>
                          <Power size={14} />
                        </button>
                        <button className="row-act" title="Copy code" onClick={() => handleCopy(c.code)}>
                          <Copy size={14} />
                        </button>
                        <button className="row-act" title="More"><MoreHorizontal size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {filteredCodes.length > 0 && (
          <div className="pager-bar">
            <span>Showing <b style={{ color: "var(--rr-fg)" }}>{filteredCodes.length}</b> of {codes.length} codes</span>
          </div>
        )}
      </div>

      <CreateCodeModal
        open={modalOpen}
        plans={plans}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}

function CreateCodeModal({ open, plans, onClose, onCreate }) {
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(20);
  const [maxUses, setMaxUses] = useState(100);
  const [expiresAt, setExpiresAt] = useState("");
  const [planIds, setPlanIds] = useState([]); // empty = all plans
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCode(randomCode());
      setDiscount(20);
      setMaxUses(100);
      setExpiresAt("");
      setPlanIds([]);
      setSaving(false);
    }
  }, [open]);

  const togglePlan = (id) => {
    setPlanIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (!code.trim()) return;
    if (discount < 1 || discount > 100) return;
    if (maxUses < 1) return;
    setSaving(true);
    try {
      await onCreate({
        code: code.trim().toUpperCase(),
        discountPercentage: Number(discount),
        maxUses: Number(maxUses),
        expiresAt: expiresAt || undefined,
        applicablePlanIds: planIds,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New redeem code"
      footer={
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", width: "100%" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" onClick={handleSubmit} disabled={saving || !code.trim()}>
            {saving ? "Creating…" : <><Zap size={14} />Create code</>}
          </button>
        </div>
      }
    >
      <div className="cc-form">
        <div className="cc-row">
          <label className="cc-field cc-grow">
            <span>Code</span>
            <div className="cc-code-row">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="LAUNCH95"
                spellCheck={false}
              />
              <button type="button" className="cc-regen" onClick={() => setCode(randomCode())} title="Generate random">
                <RotateCw size={13} />
              </button>
            </div>
          </label>
          <label className="cc-field">
            <span>Discount %</span>
            <input
              type="number"
              min="1"
              max="100"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </label>
        </div>

        <div className="cc-row">
          <label className="cc-field">
            <span>Max redemptions</span>
            <input type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </label>
          <label className="cc-field">
            <span>Expires (optional)</span>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </label>
        </div>

        <div className="cc-field">
          <span>Applicable plans <small>· leave empty to apply to all paid plans</small></span>
          <div className="cc-plans">
            {plans.filter((p) => !p.isFree).map((p) => {
              const checked = planIds.includes(p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  className={`cc-plan-chip${checked ? " on" : ""}`}
                  onClick={() => togglePlan(p.id)}
                >
                  {checked && <CircleCheck size={12} />}
                  {p.name}
                </button>
              );
            })}
            {plans.filter((p) => !p.isFree).length === 0 && (
              <span style={{ fontSize: 12, color: "var(--rr-fg-muted)" }}>No paid plans exist yet.</span>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function exportCSV(codes, planById) {
  const header = ["Code", "Discount %", "Max uses", "Current uses", "Applies to", "Expires", "Created", "Active"];
  const lines = [header.join(",")];
  for (const c of codes) {
    const plans = c.applicablePlanIds?.length
      ? c.applicablePlanIds.map((id) => planById.get(id)?.name || id).join("|")
      : "All plans";
    lines.push([
      c.code,
      c.discountPercentage,
      c.maxUses,
      c.currentUses,
      JSON.stringify(plans),
      c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : "—",
      new Date(c.createdAt).toISOString().slice(0, 10),
      c.isActive ? "yes" : "no",
    ].join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rankrush-codes-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
