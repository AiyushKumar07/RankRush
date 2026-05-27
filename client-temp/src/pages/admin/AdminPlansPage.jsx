import { useState } from "react";
import {
  Banknote, Users, Percent, CircleOff, ArrowUp, Eye, Plus,
  Leaf, Rocket, Crown, Filter, Download,
} from "lucide-react";
import PlanCard from "../../components/admin/PlanCard";
import "./AdminPlansPage.css";

const PLANS = [
  {
    icon: Leaf, name: "Free", description: "Entry tier · no card needed",
    activeSubs: "10,906", activeSubsPct: "87%", mrrContrib: "₹0",
    cadences: [{ price: "₹0", per: "/forever", count: "10,906", countLabel: "subscribed" }],
    tokenAllowance: "Token allowance · 2 / month",
    features: ["Full quiz library", "Live leaderboards & rank bar", "Streak garden", "Up to 2 study groups"],
    updatedText: "3 days ago",
  },
  {
    icon: Rocket, name: "Starter", description: "Habit-builder tier",
    activeSubs: "1,224", activeSubsPct: "9.8%", mrrContrib: "₹12,118",
    cadences: [
      { price: "₹99", per: "/month", count: "872", countLabel: "monthly" },
      { price: "₹990", per: "/year · save 17%", count: "298", countLabel: "annual" },
      { price: "₹149", per: "one-time", count: "54", countLabel: "purchased" },
    ],
    tokenAllowance: "Token allowance · 10 / month",
    features: ["Everything in Free", "Last 5 years of papers", "Weak-topic analytics", "Up to 5 study groups"],
    updatedText: "3 days ago",
  },
  {
    icon: Crown, name: "Pro", description: "Most-picked tier · featured on landing", featured: true,
    activeSubs: "351", activeSubsPct: "2.8%", mrrContrib: "₹35,702",
    cadences: [
      { price: "₹299", per: "/month", count: "218", countLabel: "monthly" },
      { price: "₹2,990", per: "/year · save 17%", count: "112", countLabel: "annual" },
      { price: "₹499", per: "one-time", count: "21", countLabel: "purchased" },
    ],
    tokenAllowance: "Token allowance · 50 / month",
    features: ["Everything in Starter", "All previous papers, every year", "Advanced analytics", "Unlimited study groups", "Mock tests included (3 tokens)", "Priority support · 4h"],
    updatedText: "Yesterday",
    editVariant: "accent",
  },
];

const TX = [
  { initial: "A", bg: "var(--rr-amber-500)", name: "Aanya Gupta", email: "aanya.g@gmail.com", plan: "Pro", planClass: "pro", cadence: "Monthly", when: "14m ago", amount: "+₹299", amountClass: "pos", status: "Paid" },
  { initial: "T", bg: "var(--rr-violet-500)", name: "Tanvi Sharma", email: "tanvi.s@gmail.com", plan: "Starter", planClass: "starter", cadence: "Annual", when: "2h ago", amount: "+₹990", amountClass: "pos", status: "Paid" },
  { initial: "R", bg: "var(--rr-cyan-500)", name: "Rohan Mehra", email: "rohan.m@gmail.com", plan: "Pro", planClass: "pro", cadence: "Monthly", when: "4h ago", amount: "+₹299", amountClass: "pos", status: "Paid" },
  { initial: "K", bg: "var(--rr-coral-400)", name: "Karthik V.", email: "karthik.v@gmail.com", plan: "Starter", planClass: "starter", cadence: "One-time", when: "6h ago", amount: "+₹149", amountClass: "pos", status: "Paid" },
  { initial: "R", bg: "var(--rr-fg-muted)", name: "Rohit K.", email: "rohit.k@gmail.com", plan: "Pro", planClass: "pro", cadence: "Monthly", when: "9h ago", amount: "−₹299", amountClass: "neg", status: "Failed", statusClass: "expired" },
  { initial: "P", bg: "var(--rr-emerald-500)", name: "Priya M.", email: "priya.m@gmail.com", plan: "Starter", planClass: "starter", cadence: "Monthly", when: "12h ago", amount: "+₹99", amountClass: "pos", status: "Paid" },
];

export default function AdminPlansPage() {
  const [subChartPeriod, setSubChartPeriod] = useState("90d");

  return (
    <div className="admin-main">
      {/* Page header */}
      <div className="page-head">
        <div>
          <div className="crumb">Monetisation / Plans</div>
          <h1>Pricing plans</h1>
          <p className="sub">3 active plans · 1,575 paying subscribers · ₹47,820 MRR.</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-secondary btn-sm"><Eye size={12} />Preview public page</button>
          <button className="btn btn-accent btn-sm"><Plus size={12} />New plan</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-strip">
        <div className="cell">
          <div className="lbl"><Banknote size={12} />MRR</div>
          <div className="v">₹47,820</div>
          <span className="delta"><ArrowUp size={12} />+8.2%</span>
        </div>
        <div className="cell">
          <div className="lbl"><Users size={12} />Paying subscribers</div>
          <div className="v">1,575</div>
          <span className="delta"><ArrowUp size={12} />+24 this week</span>
        </div>
        <div className="cell">
          <div className="lbl"><Percent size={12} />Free → paid</div>
          <div className="v">12.6<small>%</small></div>
          <span className="delta"><ArrowUp size={12} />+0.8 pp</span>
        </div>
        <div className="cell">
          <div className="lbl"><CircleOff size={12} />Monthly churn</div>
          <div className="v">3.4<small>%</small></div>
          <span className="delta down"><ArrowUp size={12} />+0.3 pp</span>
        </div>
      </div>

      {/* Plans section title */}
      <div className="sec-title">
        <h2>Plans</h2>
        <span className="sub">Drag-reorder how they appear on the public page. One Free, one Starter, one Pro · up to 3 cadences each.</span>
      </div>

      {/* Plan cards */}
      <div className="plans-admin">
        {PLANS.map((plan) => (
          <PlanCard key={plan.name} {...plan} />
        ))}
      </div>

      {/* Add plan tile */}
      <div style={{ marginBottom: 28 }}>
        <div className="pa-card add">
          <div className="ico"><Plus size={18} /></div>
          <div>
            <h4>Add a new plan</h4>
            <p>e.g. an institutional tier, a 6-month plan, or a region-specific price.</p>
          </div>
        </div>
      </div>

      {/* Subscriber growth chart */}
      <div className="sub-chart">
        <div className="sub-chart-head">
          <div>
            <h3>Subscriber growth · 90 days</h3>
            <p className="sub">Cumulative active subscribers per plan</p>
          </div>
          <div className="period-tabs">
            {["30d", "90d", "All"].map((p) => (
              <button key={p} className={subChartPeriod === p ? "on" : ""} onClick={() => setSubChartPeriod(p)}>{p}</button>
            ))}
          </div>
        </div>
        <div className="sub-chart-area">
          <div className="sub-chart-legend">
            {[
              { color: "var(--rr-fg-muted)", label: "Free", v: "10,906", delta: "+1,247" },
              { color: "var(--rr-violet-500)", label: "Starter", v: "1,224", delta: "+184" },
              { color: "var(--rr-lime-500)", label: "Pro", v: "351", delta: "+72" },
            ].map((l) => (
              <div className="row" key={l.label}>
                <span className="head"><span className="d" style={{ background: l.color }} />{l.label}</span>
                <span className="v">{l.v}</span>
                <small style={{ color: "var(--rr-emerald-500)", fontWeight: 600 }}>{l.delta}</small>
              </div>
            ))}
          </div>
          <div className="sub-chart-svg-wrap">
            <svg className="sub-chart-svg" viewBox="0 0 800 186" preserveAspectRatio="none">
              <g className="grid">
                <line x1="0" x2="800" y1="0" y2="0" />
                <line x1="0" x2="800" y1="46" y2="46" />
                <line x1="0" x2="800" y1="93" y2="93" />
                <line x1="0" x2="800" y1="140" y2="140" />
                <line x1="0" x2="800" y1="186" y2="186" />
              </g>
              <path className="line" d="M0 60 L80 55 L160 48 L240 42 L320 36 L400 32 L480 28 L560 24 L640 20 L720 14 L800 8" stroke="#76767F" />
              <path className="line" d="M0 145 L80 142 L160 138 L240 134 L320 128 L400 122 L480 118 L560 112 L640 106 L720 100 L800 92" stroke="#6D5BFF" />
              <path className="line" d="M0 170 L80 168 L160 166 L240 162 L320 158 L400 152 L480 148 L560 142 L640 136 L720 130 L800 122" stroke="#B7E224" />
            </svg>
            <div className="axis-x">
              <span>Feb 26</span><span>Mar 14</span><span>Apr 1</span><span>Apr 18</span><span>May 5</span><span>May 22</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="acard">
        <div className="acard-head" style={{ padding: "18px 22px" }}>
          <div>
            <h3>Recent transactions</h3>
            <p className="sub">Last 24 hours · 8 events</p>
          </div>
          <div className="head-actions">
            <button className="btn btn-secondary btn-sm"><Filter size={12} />Filter</button>
            <button className="btn btn-secondary btn-sm"><Download size={12} />Export</button>
          </div>
        </div>
        <table className="atable tx-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Plan</th>
              <th>Cadence</th>
              <th>Date</th>
              <th className="right">Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {TX.map((t, i) => (
              <tr key={i}>
                <td>
                  <div className="friend-mini">
                    <div className="av" style={{ background: t.bg }}>{t.initial}</div>
                    <div>
                      <span className="nm">{t.name}</span>
                      <span className="em">{t.email}</span>
                    </div>
                  </div>
                </td>
                <td><span className={`plan-tag ${t.planClass}`}>{t.plan}</span></td>
                <td>{t.cadence}</td>
                <td><span style={{ fontFamily: "var(--rr-font-mono)", fontSize: 11, color: "var(--rr-fg-muted)" }}>{t.when}</span></td>
                <td><span className={`amount ${t.amountClass}`}>{t.amount}</span></td>
                <td><span className={`status-pill ${t.statusClass || "published"}`}>{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="acard-foot">
          <span>Showing 6 of 8 transactions</span>
          <a href="#" style={{ color: "var(--rr-violet-500)", fontWeight: 500, fontSize: 12 }}>View all transactions →</a>
        </div>
      </div>
    </div>
  );
}
