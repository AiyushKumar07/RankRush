import { useState, useCallback } from "react";
import {
  Ticket, CircleCheck, Coins, TrendingUp, ArrowUp,
  Upload, Download, Plus, Zap, Settings2, RotateCw,
  Crown, Percent, Clock, Copy, Eye, Edit, MoreHorizontal,
} from "lucide-react";
import "./AdminCodesPage.css";

function randomCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const N = "23456789";
  const r = (s, n) => Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join("");
  return `RR-${r(A, 1)}${r(N, 1)}${r(A, 1)}${r(N, 1)}-${r(A, 2)}${r(N, 2)}`;
}

const CODES = [
  { code: "JEE2026", typeClass: "plan", typeIcon: Crown, typeLabel: "Plan grant", reward: "Starter · 1 month", rewardSub: "worth ₹99", used: 12, max: 100, pct: 12, barClass: "", expires: "31 Aug 2026", expiresClass: "", status: "Active", statusClass: "published" },
  { code: "ALLEN-BATCH-A", typeClass: "tokens", typeIcon: Coins, typeLabel: "Tokens", reward: "+15 tokens", rewardSub: "per redemption", used: 87, max: 250, pct: 35, barClass: "", expires: "15 Jun 2026", expiresClass: "", status: "Active", statusClass: "published" },
  { code: "WELCOME10", typeClass: "discount", typeIcon: Percent, typeLabel: "Discount", reward: "10% off any plan", rewardSub: "first month", used: 148, max: "∞", pct: 30, barClass: "", expires: "No expiry", expiresClass: "", status: "Active", statusClass: "published" },
  { code: "RR-PRO-TRIAL", typeClass: "trial", typeIcon: Clock, typeLabel: "Free trial", reward: "Pro · 7 days", rewardSub: "then auto-bills", used: 43, max: 50, pct: 86, barClass: "warn", expires: "8 Jun 2026 · 12 days", expiresClass: "warn", status: "Active", statusClass: "published" },
  { code: "AAKASH-2026", typeClass: "tokens", typeIcon: Coins, typeLabel: "Tokens", reward: "+10 tokens", rewardSub: "per redemption", used: 22, max: 100, pct: 22, barClass: "", expires: "31 Jul 2026", expiresClass: "", status: "Active", statusClass: "published" },
  { code: "FOUNDER-100", typeClass: "plan", typeIcon: Crown, typeLabel: "Plan grant", reward: "Pro · 3 months", rewardSub: "worth ₹897", used: 89, max: 100, pct: 89, barClass: "warn", expires: "31 May 2026 · 4 days", expiresClass: "warn", status: "Active", statusClass: "published" },
  { code: "DIWALI-2025", typeClass: "discount", typeIcon: Percent, typeLabel: "Discount", reward: "25% off Pro annual", rewardSub: "first year", used: 342, max: 500, pct: 68, barClass: "", expires: "15 Nov 2025", expiresClass: "expired", status: "Expired", statusClass: "expired" },
  { code: "BETA-LAUNCH", typeClass: "plan", typeIcon: Crown, typeLabel: "Plan grant", reward: "Pro · 1 month", rewardSub: "worth ₹299", used: 500, max: 500, pct: 100, barClass: "full", expires: "28 Feb 2026", expiresClass: "expired", status: "Exhausted", statusClass: "expired" },
];

const TYPE_FILTERS = ["All", "Tokens", "Plan grant", "Discount", "Trial"];
const STATUS_FILTERS = ["All", "Active", "Expired", "Paused"];

export default function AdminCodesPage() {
  const [previewCode, setPreviewCode] = useState("RR-A4F2-MX9P");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const regenerate = useCallback(() => {
    setPreviewCode(randomCode());
  }, []);

  return (
    <div className="admin-main">
      {/* Page header */}
      <div className="page-head">
        <div>
          <div className="crumb">Monetisation / Redeem codes</div>
          <h1>Redeem codes</h1>
          <p className="sub">8 active codes · 247 redemptions this month · ₹14,200 in promotional value granted.</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-secondary btn-sm"><Upload size={12} />Bulk import</button>
          <button className="btn btn-secondary btn-sm"><Download size={12} />Export</button>
          <button className="btn btn-accent btn-sm"><Plus size={12} />Generate code</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-strip">
        <div className="cell">
          <div className="lbl"><Ticket size={12} />Active codes</div>
          <div className="v">8</div>
          <span className="delta"><ArrowUp size={12} />+2 this month</span>
        </div>
        <div className="cell">
          <div className="lbl"><CircleCheck size={12} />Redemptions · 30d</div>
          <div className="v">247</div>
          <span className="delta"><ArrowUp size={12} />+38%</span>
        </div>
        <div className="cell">
          <div className="lbl"><Coins size={12} />Tokens granted</div>
          <div className="v">1,420</div>
          <span className="delta"><ArrowUp size={12} />+512 vs last 30d</span>
        </div>
        <div className="cell">
          <div className="lbl"><TrendingUp size={12} />Conversion lift</div>
          <div className="v">14.2<small>%</small></div>
          <span className="delta"><ArrowUp size={12} />vs non-code signups</span>
        </div>
      </div>

      {/* Generate inline panel */}
      <div className="gen-card">
        <div className="gen-left">
          <div className="lbl">★ Quick generate</div>
          <h2>Spin up a new redeem code in 5 seconds.</h2>
          <p>Pick a type, a reward, an expiry — we'll generate the code, give you a copy button, and a link you can paste into a coaching-centre's WhatsApp or your newsletter.</p>
          <div className="code-form-grid" style={{ maxWidth: 520, marginBottom: 12 }}>
            <div className="field">
              <label>Type</label>
              <select defaultValue="Tokens grant">
                <option>Tokens grant</option>
                <option>Plan grant (Pro · 1 month)</option>
                <option>Plan grant (Starter · 1 month)</option>
                <option>Discount % off</option>
                <option>Free trial · 7 days</option>
              </select>
            </div>
            <div className="field">
              <label>Reward</label>
              <input type="text" defaultValue="10 tokens" />
            </div>
            <div className="field">
              <label>Max redemptions</label>
              <input type="number" defaultValue={100} />
            </div>
            <div className="field">
              <label>Expires</label>
              <input type="date" defaultValue="2026-08-31" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-accent"><Zap size={14} />Generate code</button>
            <button className="btn btn-secondary"><Settings2 size={14} />Advanced options</button>
          </div>
        </div>
        <div className="gen-right">
          <span className="lbl">Live preview</span>
          <div className="preview-code">
            <span>{previewCode}</span>
            <button className="regen" title="Regenerate" onClick={regenerate}>
              <RotateCw size={13} />
            </button>
          </div>
          <div className="preview-meta">Type: <b>Tokens grant</b></div>
          <div className="preview-meta">Reward: <b>10 tokens</b></div>
          <div className="preview-meta">Uses: <b>0 / 100</b> · expires <b>31 Aug 2026</b></div>
        </div>
      </div>

      {/* Filter row */}
      <div className="filter-row-2">
        <span className="gl">Type</span>
        {TYPE_FILTERS.map((f) => (
          <button key={f} className={`chip${typeFilter === f ? " on" : ""}`} onClick={() => setTypeFilter(f)}>{f}</button>
        ))}
        <span style={{ width: 1, height: 22, background: "var(--rr-border)" }} />
        <span className="gl">Status</span>
        {STATUS_FILTERS.map((f) => (
          <button key={f} className={`chip${statusFilter === f ? " on" : ""}`} onClick={() => setStatusFilter(f)}>{f}</button>
        ))}
        <div className="right">
          <input className="search-mini" placeholder="Search by code…" />
          <select>
            <option>Newest first</option>
            <option>Most redeemed</option>
            <option>Expiring soon</option>
            <option>By type</option>
          </select>
        </div>
      </div>

      {/* Codes table */}
      <div className="acard">
        <table className="atable">
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Reward</th>
              <th>Usage</th>
              <th>Expires</th>
              <th>Status</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {CODES.map((c, i) => (
              <tr key={i}>
                <td>
                  <div className="code-cell">
                    <span className="code-tag">{c.code}</span>
                    <button className="copy-btn" title="Copy"><Copy size={12} /></button>
                  </div>
                </td>
                <td>
                  <span className={`type-tag ${c.typeClass}`}>
                    <c.typeIcon size={12} />
                    {c.typeLabel}
                  </span>
                </td>
                <td>
                  <div className="reward">
                    {c.reward}
                    <small>{c.rewardSub}</small>
                  </div>
                </td>
                <td>
                  <div className="uses-cell">
                    <div className="uses-top">
                      <span>{c.used} / {c.max}</span>
                      <b>{c.pct === 100 ? "100%" : c.max === "∞" ? "—" : `${c.pct}%`}</b>
                    </div>
                    <div className="uses-bar">
                      <div className={`fill ${c.barClass}`} style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                </td>
                <td><span className={`expires ${c.expiresClass}`}>{c.expires}</span></td>
                <td><span className={`status-pill ${c.statusClass}`}>{c.status}</span></td>
                <td className="right">
                  <div className="row-actions">
                    <button className="row-act" title="View"><Eye size={14} /></button>
                    <button className="row-act" title="Edit">
                      {c.statusClass === "expired" ? <Copy size={14} /> : <Edit size={14} />}
                    </button>
                    <button className="row-act" title="More"><MoreHorizontal size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pager-bar">
          <span>Showing <b style={{ color: "var(--rr-fg)" }}>1–8</b> of 8 codes</span>
          <div className="pager">
            <button className="on">1</button>
          </div>
        </div>
      </div>
    </div>
  );
}
