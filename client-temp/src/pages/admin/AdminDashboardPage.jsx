import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Banknote, Users, UserPlus, Zap, Crown, Flame, Target, CircleOff,
  Download, ArrowRight, BookOpen, RotateCcw,
  Ticket, MessageSquare, Plus, Mail,
} from "lucide-react";
import KPICard from "../../components/admin/KPICard";
import BrandLoader from "../../components/brand/BrandLoader";
import { adminOverviewAPI } from "../../services/api";
import "./AdminDashboardPage.css";

const PERIODS = [
  { label: "Today",   key: "today" },
  { label: "7 days",  key: "7d" },
  { label: "30 days", key: "30d" },
  { label: "QTD",     key: "qtd" },
  { label: "YTD",     key: "ytd" },
];

const CHART_PERIODS = [
  { label: "7d",  days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

const QA = [
  { to: "/admin/quizzes", Icon: Plus, title: "New quiz", sub: "Add to library" },
  { to: "/admin/plans", Icon: Crown, title: "Edit plans", sub: "Pricing & tokens" },
  { to: "/admin/codes", Icon: Ticket, title: "Generate code", sub: "Redeem & promos" },
  { Icon: Mail, title: "Broadcast", sub: "Email all students" },
];

const RUPEE = (n) =>
  `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString("en-IN");

const fmtDelta = (deltaPct) => {
  if (deltaPct === null || deltaPct === undefined) return null;
  const v = Number(deltaPct);
  const sign = v >= 0 ? "+" : "−";
  return `${sign}${Math.abs(v).toFixed(1)}%`;
};

const fmtSignedAbs = (n) => {
  if (n === null || n === undefined) return null;
  const v = Number(n);
  return `${v >= 0 ? "+" : "−"}${Math.abs(v).toLocaleString("en-IN")}`;
};

const fmtDateLong = (d) => {
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "short", year: "numeric",
    });
  } catch { return ""; }
};

const fmtRelative = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
};

const accClass = (pct) => {
  const v = Number(pct) || 0;
  if (v >= 80) return "good";
  if (v >= 65) return "ok";
  return "bad";
};

// Server wraps responses in { data: {...} } and the global axios interceptor
// already strips one layer (response.data), so a second unwrap gets us to
// the actual payload. Mirrors the helper used in the student dashboard.
const unwrap = (res) => res?.data ?? res ?? null;

// Tiny sparkline path generator. Maps a numeric series into a 0–80 × 6–24
// SVG path so the existing KPICard <svg viewBox="0 0 80 28"> looks correct.
const sparkPath = (series) => {
  if (!series || series.length === 0) return null;
  const w = 80, top = 6, bot = 24;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const step = series.length > 1 ? w / (series.length - 1) : w;
  return series
    .map((v, i) => {
      const x = i * step;
      const y = bot - ((v - min) / range) * (bot - top);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
};

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState("7d");
  const [chartDays, setChartDays] = useState(30);

  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState(null);
  const [topQuizzes, setTopQuizzes] = useState([]);
  const [feed, setFeed] = useState([]);
  const [health, setHealth] = useState(null);

  const [overviewLoading, setOverviewLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);

  // Overview reacts to the period selector.
  useEffect(() => {
    let cancelled = false;
    setOverviewLoading(true);
    adminOverviewAPI.getOverview(period)
      .then((data) => { if (!cancelled) setOverview(unwrap(data)); })
      .catch((err) => {
        if (!cancelled) toast.error(err?.message || "Failed to load dashboard");
      })
      .finally(() => { if (!cancelled) setOverviewLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  // Revenue trend reacts to its own chip selector.
  useEffect(() => {
    let cancelled = false;
    setTrendLoading(true);
    adminOverviewAPI.getRevenueTrend(chartDays)
      .then((data) => { if (!cancelled) setTrend(unwrap(data)); })
      .catch((err) => {
        if (!cancelled) toast.error(err?.message || "Failed to load revenue trend");
      })
      .finally(() => { if (!cancelled) setTrendLoading(false); });
    return () => { cancelled = true; };
  }, [chartDays]);

  // Top quizzes + feed only need to load once.
  useEffect(() => {
    adminOverviewAPI.getTopQuizzes({ days: 7, limit: 5 })
      .then((data) => setTopQuizzes(unwrap(data)?.rows || []))
      .catch(() => {});
    adminOverviewAPI.getActivityFeed(12)
      .then((data) => setFeed(unwrap(data)?.rows || []))
      .catch(() => {});
  }, []);

  // System health re-polls every 30s — uptime and queue depth move in real
  // time and a stale panel is misleading.
  useEffect(() => {
    let cancelled = false;
    const load = () => adminOverviewAPI.getSystemHealth()
      .then((data) => { if (!cancelled) setHealth(unwrap(data)); })
      .catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const kpis = overview?.kpis;
  const dist = overview?.planDistribution;
  const trendPoints = trend?.points || [];
  const trendSummary = trend?.summary;

  // KPI sparkline series come from the trend payload so the spark visually
  // tracks what's happening on the chart below.
  const subSeries = useMemo(() => trendPoints.map((p) => p.subscriptions), [trendPoints]);
  const oneTimeSeries = useMemo(() => trendPoints.map((p) => p.oneTime), [trendPoints]);
  const totalSeries = useMemo(() => trendPoints.map((p) => p.total), [trendPoints]);

  const KPI_LIST = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        icon: Banknote,
        label: "MRR",
        value: RUPEE(kpis.mrr.value),
        delta: fmtDelta(kpis.mrr.deltaPct),
        deltaType: (kpis.mrr.deltaPct ?? 0) >= 0 ? "up" : "down",
        hint: kpis.mrr.prev > 0 ? `vs ${RUPEE(kpis.mrr.prev)} prior` : "no prior data",
        sparkColor: "var(--rr-emerald-500)",
        sparkPath: sparkPath(subSeries),
      },
      {
        icon: Users,
        label: "Active students",
        value: fmtInt(kpis.activeStudents.value),
        delta: fmtSignedAbs(kpis.activeStudents.delta),
        deltaType: kpis.activeStudents.delta >= 0 ? "up" : "down",
        hint: "Active in last 14 days",
        sparkColor: "var(--rr-violet-500)",
        sparkPath: sparkPath(totalSeries),
      },
      {
        icon: UserPlus,
        label: "Signups · today",
        value: fmtInt(kpis.signupsToday.value),
        delta: kpis.signupsToday.avg7 > 0 ? `avg ${kpis.signupsToday.avg7}/d` : null,
        deltaType: "neutral",
        hint: `7-day avg ${kpis.signupsToday.avg7}/day`,
        sparkColor: "var(--rr-cyan-500)",
        sparkPath: sparkPath(totalSeries),
      },
      {
        icon: Zap,
        label: "Quizzes · 24h",
        value: fmtInt(kpis.quizzes24h.value),
        delta: fmtDelta(kpis.quizzes24h.deltaPct),
        deltaType: (kpis.quizzes24h.deltaPct ?? 0) >= 0 ? "up" : "down",
        hint: "vs prior 24h",
        sparkColor: "var(--rr-amber-500)",
        sparkPath: sparkPath(totalSeries),
      },
      {
        icon: Crown,
        label: "Pro conversions · today",
        value: fmtInt(kpis.proConversions.count),
        valueSuffix: kpis.proConversions.revenue > 0 ? ` · ${RUPEE(kpis.proConversions.revenue)}` : null,
        delta: kpis.proConversions.rate > 0 ? `${kpis.proConversions.rate}%` : null,
        deltaType: "up",
        hint: `conversion rate ${kpis.proConversions.rate}%`,
        sparkColor: "var(--rr-lime-500)",
        sparkPath: sparkPath(subSeries),
      },
      {
        icon: Flame,
        label: "Avg. streak",
        value: kpis.avgStreak.value.toFixed(1),
        valueSuffix: " days",
        delta: null,
        deltaType: "neutral",
        hint: `across ${fmtInt(kpis.avgStreak.sampleSize)} active students`,
        sparkColor: "var(--rr-amber-500)",
        sparkPath: null,
      },
      {
        icon: Target,
        label: "Avg. accuracy",
        value: kpis.avgAccuracy.value.toFixed(1),
        valueSuffix: "%",
        delta: kpis.avgAccuracy.prev > 0
          ? fmtDelta(((kpis.avgAccuracy.value - kpis.avgAccuracy.prev) / kpis.avgAccuracy.prev) * 100)
          : null,
        deltaType: kpis.avgAccuracy.value >= kpis.avgAccuracy.prev ? "up" : "down",
        hint: `last ${fmtInt(kpis.avgAccuracy.sampleSize)} attempts`,
        sparkColor: "var(--rr-coral-500)",
        sparkPath: null,
      },
      {
        icon: CircleOff,
        label: "Failed payments · 24h",
        value: fmtInt(kpis.failedPayments24h.value),
        delta: kpis.failedPayments24h.value > 0 ? `${kpis.failedPayments24h.value}` : null,
        deltaType: kpis.failedPayments24h.value > 0 ? "down" : "up",
        hint: `${kpis.failedPayments24h.subscriptions} subscription · ${kpis.failedPayments24h.oneTime} one-time`,
        sparkColor: "var(--rr-fg-muted)",
        sparkPath: null,
      },
    ];
  }, [kpis, subSeries, oneTimeSeries, totalSeries]);

  if (overviewLoading && !overview) {
    return <div className="admin-main"><BrandLoader /></div>;
  }

  // Chart axis scaling — pick a nice Y max so the path fits and grid lines
  // line up with sensible ₹k labels.
  const yMaxRaw = trendPoints.reduce((m, p) => Math.max(m, p.total), 0);
  const yMax = Math.max(1000, Math.ceil(yMaxRaw / 1000) * 1000 * 1.1);
  const buildPath = (key, closeArea = false) => {
    if (trendPoints.length === 0) return "";
    const w = 800, h = 220;
    const step = trendPoints.length > 1 ? w / (trendPoints.length - 1) : w;
    const pts = trendPoints.map((p, i) => {
      const v = p[key] || 0;
      const x = i * step;
      const y = h - (v / yMax) * h;
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    if (closeArea) {
      return `M${pts[0]} L${pts.slice(1).join(" L")} L${w} ${h} L0 ${h} Z`;
    }
    return `M${pts[0]} L${pts.slice(1).join(" L")}`;
  };

  const axisXLabels = (() => {
    if (trendPoints.length === 0) return [];
    const idxs = [0, Math.floor(trendPoints.length * 0.25), Math.floor(trendPoints.length * 0.5), Math.floor(trendPoints.length * 0.75), trendPoints.length - 1];
    return idxs.map((i) => {
      const d = new Date(trendPoints[i].day);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    });
  })();

  const yLabels = [yMax, yMax * 0.75, yMax * 0.5, yMax * 0.25, 0]
    .map((v) => v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${Math.round(v)}`);

  return (
    <div className="admin-main">
      {/* Page header */}
      <div className="page-head">
        <div>
          <div className="crumb">/ Overview</div>
          <h1>Dashboard</h1>
          <p className="sub">{fmtDateLong(new Date())} · live data</p>
        </div>
        <div className="head-actions">
          <div className="period-tabs" role="tablist">
            {PERIODS.map((p) => (
              <button key={p.key} className={period === p.key ? "on" : ""} onClick={() => setPeriod(p.key)}>{p.label}</button>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm"><Download size={12} />Export</button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-grid">
        {KPI_LIST.map((kpi, i) => (
          <KPICard key={i} {...kpi} />
        ))}
      </div>

      {/* Revenue chart + Plan distribution */}
      <div className="row-2">
        <div className="acard chart-card">
          <div className="acard-head" style={{ padding: "18px 22px 14px" }}>
            <div>
              <h3>Revenue trend</h3>
              <p className="sub">Daily revenue · last {chartDays} days</p>
            </div>
            <div className="period-tabs">
              {CHART_PERIODS.map((p) => (
                <button key={p.label} className={chartDays === p.days ? "on" : ""} onClick={() => setChartDays(p.days)}>{p.label}</button>
              ))}
            </div>
          </div>
          <div className="chart-card-meta">
            <span className="num">{RUPEE(trendSummary?.total || 0)}</span>
            <div className="lbl-side">
              <span className="lbl">{chartDays}-day total</span>
              {trendSummary?.deltaPct !== null && trendSummary?.deltaPct !== undefined ? (
                <span className="change">
                  {trendSummary.deltaPct >= 0 ? "↑" : "↓"} {RUPEE(Math.abs(trendSummary.deltaAbs))} ({fmtDelta(trendSummary.deltaPct)}) vs prior
                </span>
              ) : (
                <span className="change">no prior data</span>
              )}
            </div>
          </div>
          <div className="chart-legend">
            <span className="item"><span className="swatch" style={{ background: "var(--rr-violet-500)" }} />Subscriptions</span>
            <span className="item"><span className="swatch" style={{ background: "var(--rr-cyan-500)" }} />One-time</span>
          </div>
          <div className="chart-area">
            <div className="axis-y">{yLabels.map((l) => <span key={l}>{l}</span>)}</div>
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
              {trendPoints.length > 0 && (
                <>
                  <path d={buildPath("subscriptions", true)} fill="url(#violetFill)" />
                  <path d={buildPath("subscriptions")} stroke="#6D5BFF" strokeWidth="2" fill="none" />
                  <path d={buildPath("oneTime", true)} fill="url(#cyanFill)" />
                  <path d={buildPath("oneTime")} stroke="#06D8C2" strokeWidth="2" fill="none" />
                </>
              )}
            </svg>
            <div className="axis-x">{axisXLabels.map((l, i) => <span key={i}>{l}</span>)}</div>
            {trendLoading && trendPoints.length === 0 && (
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--rr-fg-muted)", fontSize: 13 }}>
                Loading…
              </div>
            )}
          </div>
        </div>

        <div className="acard">
          <div className="acard-head">
            <div>
              <h3>Plan distribution</h3>
              <p className="sub">Active student split · {fmtInt(dist?.total || 0)} total</p>
            </div>
          </div>
          <div className="acard-body">
            <div className="plan-dist">
              {(dist?.rows || []).slice(0, 4).map((p, i) => {
                const color = p.name === "Free"
                  ? "var(--rr-fg-muted)"
                  : i === 1 ? "var(--rr-violet-500)"
                  : i === 2 ? "var(--rr-lime-500)"
                  : "var(--rr-cyan-500)";
                return (
                  <div className="row" key={p.name}>
                    <span className="name"><span className="d" style={{ background: color }} />{p.name}</span>
                    <div className="bar"><div className="fill" style={{ width: `${p.percentage}%`, background: color }} /></div>
                    <div className="right"><b>{fmtInt(p.count)}</b><small>{p.percentage}%</small></div>
                  </div>
                );
              })}
              {(!dist || dist.rows.length === 0) && (
                <p className="sub" style={{ padding: "16px 0", textAlign: "center" }}>No students yet</p>
              )}
            </div>
            <div className="dist-total">
              <span>Paid · contribution to MRR</span>
              <span><b>{RUPEE(kpis?.mrr.value || 0)}</b> · {dist?.paidShare ?? 0}% paid</span>
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
            <Link to="/admin/quizzes" className="row-act" title="View all"><ArrowRight size={14} /></Link>
          </div>
          <div className="acard-body">
            <div className="top-quizzes">
              {topQuizzes.length === 0 ? (
                <p className="sub" style={{ padding: "16px 0", textAlign: "center" }}>No completed attempts in the last 7 days</p>
              ) : (
                topQuizzes.map((q, i) => (
                  <div className="tq-row" key={q.quizId}>
                    <span className="ix">{i + 1}</span>
                    <div className="info">
                      <span className="title">{q.title}</span>
                      <span className="topic">{q.subject}</span>
                    </div>
                    <span className="att">{fmtInt(q.attempts)}<small> att.</small></span>
                    <span className={`acc ${accClass(q.avgAccuracy)}`}>{Math.round(q.avgAccuracy)}%</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="acard">
          <div className="acard-head">
            <div>
              <h3>Recent activity</h3>
              <p className="sub">Live · last 24 hours</p>
            </div>
            <span className="status-pill published">Live</span>
          </div>
          <div className="acard-body">
            <div className="feed">
              {feed.length === 0 ? (
                <p className="sub" style={{ padding: "16px 0", textAlign: "center" }}>Nothing yet — the last 24h are quiet</p>
              ) : (
                feed.map((f, i) => {
                  const Icon = f.kind === "payment" ? Banknote
                    : f.kind === "signup" ? UserPlus
                    : f.kind === "quiz" ? BookOpen
                    : f.kind === "redeem" ? Ticket
                    : f.kind === "refund" ? RotateCcw
                    : MessageSquare;
                  return (
                    <div className="feed-row" key={i}>
                      <div className={`ico ${f.kind}`}><Icon size={14} /></div>
                      <div className="text">
                        <span className="title">{f.title}</span>
                        <span className="meta">{f.meta}</span>
                      </div>
                      {f.amount !== null && f.amount !== undefined
                        ? <span className={`amount ${f.amount >= 0 ? "pos" : "neg"}`}>{f.amount >= 0 ? "+" : "−"}{RUPEE(Math.abs(f.amount))}</span>
                        : <span className="when">{fmtRelative(f.at)}</span>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Health + Quick actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="acard">
            <div className="acard-head">
              <div>
                <h3>System health</h3>
                <p className="sub">
                  {health?.overall === "bad" ? "Degraded — investigate"
                    : health?.overall === "warn" ? "Watch — running hot"
                    : "All systems normal"}
                </p>
              </div>
              <span className={`status-pill ${health?.overall === "bad" ? "draft" : health?.overall === "warn" ? "scheduled" : "published"}`}>
                {health?.overall === "bad" ? "Down"
                  : health?.overall === "warn" ? "Watch"
                  : "Healthy"}
              </span>
            </div>
            <div className="acard-body">
              <div className="health-list">
                {!health ? (
                  <p className="sub" style={{ padding: "16px 0", textAlign: "center" }}>Loading…</p>
                ) : (
                  health.rows.map((h) => {
                    const statLabel = h.status === "bad" ? "Down" : h.status === "warn" ? "Watch" : "OK";
                    const dotClass = h.status === "bad" ? "bad" : h.status === "warn" ? "warn" : "ok";
                    return (
                      <div className="health-row" key={h.key}>
                        <span className="label"><span className={`dot ${dotClass}`} />{h.label}</span>
                        <span className="val">{h.value}</span>
                        <span className={`stat ${h.status}`}>{statLabel}</span>
                      </div>
                    );
                  })
                )}
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
