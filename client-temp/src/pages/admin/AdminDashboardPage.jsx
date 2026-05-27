import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Banknote, Users, UserPlus, Zap, Crown, Flame, Target, CircleOff,
  ArrowUp, ArrowDown, Download, ArrowRight, BookOpen, RotateCcw,
  Ticket, MessageSquare, Plus, Mail,
} from "lucide-react";
import KPICard from "../../components/admin/KPICard";
import "./AdminDashboardPage.css";

const PERIODS = ["Today", "7 days", "30 days", "QTD", "YTD"];

const KPIS = [
  { icon: Banknote, label: "MRR", value: "₹47,820", delta: "+8.2%", deltaType: "up", hint: "vs ₹44,210 last week", sparkColor: "var(--rr-emerald-500)", sparkPath: "M0 22 L10 20 L20 18 L30 19 L40 14 L50 10 L60 8 L70 6 L80 4" },
  { icon: Users, label: "Active students", value: "1,847", delta: "+147", deltaType: "up", hint: "DAU · all-time high", sparkColor: "var(--rr-violet-500)", sparkPath: "M0 18 L10 16 L20 19 L30 14 L40 12 L50 13 L60 9 L70 8 L80 6" },
  { icon: UserPlus, label: "Signups · today", value: "24", delta: "+6", deltaType: "up", hint: "avg 18/day this week", sparkColor: "var(--rr-cyan-500)", sparkPath: "M0 20 L10 18 L20 22 L30 16 L40 14 L50 18 L60 12 L70 10 L80 7" },
  { icon: Zap, label: "Quizzes · 24h", value: "4,392", delta: "+12%", deltaType: "up", hint: "peak: 6:30–8:30 PM", sparkColor: "var(--rr-amber-500)", sparkPath: "M0 22 L10 24 L20 18 L30 20 L40 14 L50 16 L60 10 L70 8 L80 6" },
  { icon: Crown, label: "Pro conversions · today", value: "6", valueSuffix: " · ₹1,794", delta: "+2", deltaType: "up", hint: "conversion rate 4.1%", sparkColor: "var(--rr-lime-500)", sparkPath: "M0 20 L10 18 L20 16 L30 18 L40 12 L50 10 L60 12 L70 8 L80 6" },
  { icon: Flame, label: "Avg. streak", value: "8.4", valueSuffix: " days", delta: "+0.3 d", deltaType: "neutral", hint: "across active students", sparkColor: "var(--rr-amber-500)", sparkPath: "M0 16 L10 15 L20 17 L30 14 L40 13 L50 15 L60 13 L70 12 L80 11" },
  { icon: Target, label: "Avg. accuracy", value: "68.4", valueSuffix: "%", delta: "−1.2%", deltaType: "down", hint: "last 1,000 attempts", sparkColor: "var(--rr-coral-500)", sparkPath: "M0 12 L10 11 L20 13 L30 14 L40 12 L50 15 L60 14 L70 16 L80 15" },
  { icon: CircleOff, label: "Failed payments · 24h", value: "2", delta: "+1", deltaType: "down", hint: "1 retry pending · 1 cancelled", sparkColor: "var(--rr-fg-muted)", sparkPath: "M0 22 L10 22 L20 20 L30 22 L40 20 L50 22 L60 20 L70 18 L80 16" },
];

const TOP_QUIZZES = [
  { title: "Calculus · Limits & continuity", topic: "Math · Hard", att: "1,247", acc: "92%", accClass: "good" },
  { title: "JEE Main Mock 04", topic: "Mixed PCM · 3h", att: "894", acc: "71%", accClass: "ok" },
  { title: "Periodic table — block by block", topic: "Chemistry · Medium", att: "812", acc: "88%", accClass: "good" },
  { title: "Rotational dynamics", topic: "Physics · Hard", att: "734", acc: "58%", accClass: "bad" },
  { title: "Trigonometry identities", topic: "Math · Medium", att: "621", acc: "84%", accClass: "good" },
];

const FEED = [
  { ico: "payment", Icon: Banknote, title: <><b>Aanya Gupta</b> upgraded to Pro</>, meta: "Plan · monthly · aanya.g@gmail.com", right: <span className="amount pos">+₹299</span> },
  { ico: "signup", Icon: UserPlus, title: <><b>Karthik V.</b> signed up</>, meta: "Free · class 12 · Aakash · Delhi", right: <span className="when">2m ago</span> },
  { ico: "quiz", Icon: BookOpen, title: <><b>Calculus · Differentiation</b> published</>, meta: "By Astitva R. · 18 questions added", right: <span className="when">8m ago</span> },
  { ico: "redeem", Icon: Ticket, title: <>Redeem code <b>JEE2026</b> used</>, meta: "Granted Starter · 12 of 100 redemptions", right: <span className="when">14m ago</span> },
  { ico: "payment", Icon: Banknote, title: <><b>Tanvi S.</b> upgraded to Starter</>, meta: "Plan · annual · tanvi.s@gmail.com", right: <span className="amount pos">+₹990</span> },
  { ico: "refund", Icon: RotateCcw, title: <>Payment failed · <b>rohit.k@gmail.com</b></>, meta: "Auto-retry scheduled in 3 hours", right: <span className="amount neg">−₹299</span> },
  { ico: "support", Icon: MessageSquare, title: <>Support ticket #847 opened</>, meta: 'priya.m · "Can\'t redeem JEE2026 code"', right: <span className="when">22m ago</span> },
];

const HEALTH = [
  { label: "API uptime", dot: "ok", val: "99.98%", stat: "OK", statClass: "ok" },
  { label: "p99 response", dot: "ok", val: "142ms", stat: "OK", statClass: "ok" },
  { label: "Queue depth", dot: "warn", val: "847 jobs", stat: "Watch", statClass: "warn" },
  { label: "DB connections", dot: "ok", val: "42 / 100", stat: "OK", statClass: "ok" },
  { label: "CDN cache hit", dot: "ok", val: "94.2%", stat: "OK", statClass: "ok" },
];

const QA = [
  { to: "/admin/quizzes", Icon: Plus, title: "New quiz", sub: "Add to library" },
  { to: "/admin/plans", Icon: Crown, title: "Edit plans", sub: "Pricing & tokens" },
  { to: "/admin/codes", Icon: Ticket, title: "Generate code", sub: "Redeem & promos" },
  { Icon: Mail, title: "Broadcast", sub: "Email all students" },
];

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState("7 days");
  const [chartPeriod, setChartPeriod] = useState("30d");

  return (
    <div className="admin-main">
      {/* Page header */}
      <div className="page-head">
        <div>
          <div className="crumb">/ Overview</div>
          <h1>Dashboard</h1>
          <p className="sub">Tuesday, 27 May 2026 · last 24 hours · live data</p>
        </div>
        <div className="head-actions">
          <div className="period-tabs" role="tablist">
            {PERIODS.map((p) => (
              <button key={p} className={period === p ? "on" : ""} onClick={() => setPeriod(p)}>{p}</button>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm"><Download size={12} />Export</button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-grid">
        {KPIS.map((kpi, i) => (
          <KPICard key={i} {...kpi} />
        ))}
      </div>

      {/* Revenue chart + Plan distribution */}
      <div className="row-2">
        <div className="acard chart-card">
          <div className="acard-head" style={{ padding: "18px 22px 14px" }}>
            <div>
              <h3>Revenue trend</h3>
              <p className="sub">Daily revenue · last 30 days</p>
            </div>
            <div className="period-tabs">
              {["7d", "30d", "90d"].map((p) => (
                <button key={p} className={chartPeriod === p ? "on" : ""} onClick={() => setChartPeriod(p)}>{p}</button>
              ))}
            </div>
          </div>
          <div className="chart-card-meta">
            <span className="num">₹47,820</span>
            <div className="lbl-side">
              <span className="lbl">7-day total</span>
              <span className="change">↑ ₹3,610 (+8.2%) vs prior 7d</span>
            </div>
          </div>
          <div className="chart-legend">
            <span className="item"><span className="swatch" style={{ background: "var(--rr-violet-500)" }} />Subscriptions</span>
            <span className="item"><span className="swatch" style={{ background: "var(--rr-cyan-500)" }} />One-time</span>
          </div>
          <div className="chart-area">
            <div className="axis-y"><span>₹12k</span><span>₹9k</span><span>₹6k</span><span>₹3k</span><span>₹0</span></div>
            <svg className="chart-svg" viewBox="0 0 800 220" preserveAspectRatio="none">
              <g className="chart-grid">
                <line x1="0" x2="800" y1="0" y2="0" />
                <line x1="0" x2="800" y1="55" y2="55" />
                <line x1="0" x2="800" y1="110" y2="110" />
                <line x1="0" x2="800" y1="165" y2="165" />
                <line x1="0" x2="800" y1="220" y2="220" />
              </g>
              <defs>
                <linearGradient id="violetFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#6D5BFF" stopOpacity="0.32" />
                  <stop offset="1" stopColor="#6D5BFF" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="cyanFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#06D8C2" stopOpacity="0.22" />
                  <stop offset="1" stopColor="#06D8C2" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 180 L27 175 L54 168 L81 172 L108 160 L135 165 L162 150 L189 142 L216 145 L243 135 L270 128 L297 132 L324 120 L351 110 L378 115 L405 100 L432 96 L459 88 L486 84 L513 92 L540 78 L567 70 L594 62 L621 55 L648 60 L675 48 L702 44 L729 40 L756 36 L783 32 L800 28 L800 220 L0 220 Z" fill="url(#violetFill)" />
              <path d="M0 180 L27 175 L54 168 L81 172 L108 160 L135 165 L162 150 L189 142 L216 145 L243 135 L270 128 L297 132 L324 120 L351 110 L378 115 L405 100 L432 96 L459 88 L486 84 L513 92 L540 78 L567 70 L594 62 L621 55 L648 60 L675 48 L702 44 L729 40 L756 36 L783 32 L800 28" stroke="#6D5BFF" strokeWidth="2" fill="none" />
              <path d="M0 205 L27 200 L54 202 L81 198 L108 195 L135 198 L162 192 L189 188 L216 190 L243 184 L270 180 L297 182 L324 175 L351 172 L378 168 L405 170 L432 165 L459 160 L486 158 L513 162 L540 155 L567 150 L594 148 L621 142 L648 145 L675 140 L702 138 L729 135 L756 132 L783 130 L800 128 L800 220 L0 220 Z" fill="url(#cyanFill)" />
              <path d="M0 205 L27 200 L54 202 L81 198 L108 195 L135 198 L162 192 L189 188 L216 190 L243 184 L270 180 L297 182 L324 175 L351 172 L378 168 L405 170 L432 165 L459 160 L486 158 L513 162 L540 155 L567 150 L594 148 L621 142 L648 145 L675 140 L702 138 L729 135 L756 132 L783 130 L800 128" stroke="#06D8C2" strokeWidth="2" fill="none" />
            </svg>
            <div className="axis-x"><span>Apr 28</span><span>May 5</span><span>May 12</span><span>May 19</span><span>May 26</span></div>
          </div>
        </div>

        <div className="acard">
          <div className="acard-head">
            <div>
              <h3>Plan distribution</h3>
              <p className="sub">Active student split · 12,481 total</p>
            </div>
          </div>
          <div className="acard-body">
            <div className="plan-dist">
              {[
                { name: "Free", color: "var(--rr-fg-muted)", pct: 87.4, count: "10,906" },
                { name: "Starter", color: "var(--rr-violet-500)", pct: 9.8, count: "1,224" },
                { name: "Pro", color: "var(--rr-lime-500)", pct: 2.8, count: "351" },
              ].map((p) => (
                <div className="row" key={p.name}>
                  <span className="name"><span className="d" style={{ background: p.color }} />{p.name}</span>
                  <div className="bar"><div className="fill" style={{ width: `${p.pct}%`, background: p.color }} /></div>
                  <div className="right"><b>{p.count}</b><small>{p.pct}%</small></div>
                </div>
              ))}
            </div>
            <div className="dist-total">
              <span>Paid · contribution to MRR</span>
              <span><b>₹47,820</b> · 12.6% paid</span>
            </div>
          </div>
        </div>
      </div>

      {/* What's happening */}
      <div className="sec-title">
        <h2>What's happening</h2>
      </div>
      <div className="row-3">
        {/* Top quizzes */}
        <div className="acard">
          <div className="acard-head">
            <div>
              <h3>Top quizzes · last 7d</h3>
              <p className="sub">By attempts</p>
            </div>
            <button className="row-act" title="View all"><ArrowRight size={14} /></button>
          </div>
          <div className="acard-body">
            <div className="top-quizzes">
              {TOP_QUIZZES.map((q, i) => (
                <div className="tq-row" key={i}>
                  <span className="ix">{i + 1}</span>
                  <div className="info">
                    <span className="title">{q.title}</span>
                    <span className="topic">{q.topic}</span>
                  </div>
                  <span className="att">{q.att}<small> att.</small></span>
                  <span className={`acc ${q.accClass}`}>{q.acc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="acard">
          <div className="acard-head">
            <div>
              <h3>Recent activity</h3>
              <p className="sub">Live · last 30 minutes</p>
            </div>
            <span className="status-pill published">Live</span>
          </div>
          <div className="acard-body">
            <div className="feed">
              {FEED.map((f, i) => (
                <div className="feed-row" key={i}>
                  <div className={`ico ${f.ico}`}><f.Icon size={14} /></div>
                  <div className="text">
                    <span className="title">{f.title}</span>
                    <span className="meta">{f.meta}</span>
                  </div>
                  {f.right}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Health + Quick actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="acard">
            <div className="acard-head">
              <div>
                <h3>System health</h3>
                <p className="sub">All systems normal</p>
              </div>
              <span className="status-pill published">Healthy</span>
            </div>
            <div className="acard-body">
              <div className="health-list">
                {HEALTH.map((h, i) => (
                  <div className="health-row" key={i}>
                    <span className="label"><span className={`dot ${h.dot}`} />{h.label}</span>
                    <span className="val">{h.val}</span>
                    <span className={`stat ${h.statClass}`}>{h.stat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="acard">
            <div className="acard-head">
              <div><h3>Quick actions</h3></div>
            </div>
            <div className="acard-body" style={{ padding: 14 }}>
              <div className="qa-grid">
                {QA.map((q, i) => {
                  const Wrapper = q.to ? Link : "span";
                  return (
                    <Wrapper key={i} className="qa-tile" to={q.to}>
                      <div className="ico"><q.Icon size={15} /></div>
                      <div className="text">
                        <span className="title">{q.title}</span>
                        <span className="sub">{q.sub}</span>
                      </div>
                    </Wrapper>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
