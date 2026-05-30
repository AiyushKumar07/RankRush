import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Flame, Target, CircleCheck, Clock,
  Sparkles, Play, TrendingUp, Zap, Medal,
  Users, Swords, Crown, ArrowRight, Lock,
} from "lucide-react";
import RankBarHero from "../../components/student/RankBarHero";
import StreakGarden from "../../components/student/StreakGarden";
import StatCard from "../../components/ui/StatCard";
import { useAuth } from "../../context/AuthContext";
import { useEntitlements } from "../../hooks/useEntitlements";
import { activityAPI, leaderboardsAPI, studentAPI } from "../../services/api";
import "./DashboardPage.css";

function unwrap(res) { return res?.data ?? res ?? null; }

// "Good morning" / "afternoon" / "evening" / "night" based on local hour.
function greetingFor(date) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Working late";
}

function fmtClock(date) {
  return date.toLocaleString("en-IN", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Map raw snapshot points → the 4-step "4 wks / 2 wks / Last wk / Now" trail
// the hero expects. Buckets the points into the four windows ending now,
// each carrying the most recent snapshot in that window.
function buildHistoryTrail(points, currentRank) {
  const now = Date.now();
  const buckets = [
    { when: "4 wks ago", from: 28, to: 21 },
    { when: "2 wks ago", from: 21, to: 7 },
    { when: "Last wk",   from: 7,  to: 1 },
  ];
  const trail = buckets.map((b) => {
    const fromMs = now - b.from * 86_400_000;
    const toMs = now - b.to * 86_400_000;
    const inWindow = (points || []).filter((p) => {
      const t = new Date(p.at).getTime();
      return t >= fromMs && t <= toMs;
    });
    const last = inWindow[inWindow.length - 1];
    return last ? { when: b.when, rank: last.rank } : null;
  });
  trail.push({ when: "Now", rank: currentRank });
  return trail.filter(Boolean);
}

const CHART_DATA = [
  { day: "Mon", value: 28, height: "35%" },
  { day: "Tue", value: 52, height: "62%" },
  { day: "Wed", value: 41, height: "50%" },
  { day: "Thu", value: 66, height: "78%" },
  { day: "Fri", value: 58, height: "70%" },
  { day: "Sat", value: 78, height: "92%" },
  { day: "Today", value: 89, height: "100%", isToday: true },
];

const FRIENDS = [
  { initial: "A", name: "Aanya G.", status: "Calculus · 23 min in", color: "var(--rr-amber-500)" },
  { initial: "R", name: "Rohan M.", status: "Organic chem · 4 min in", color: "var(--rr-cyan-500)" },
  { initial: "T", name: "Tanvi S.", status: "Mechanics · 11 min in", color: "var(--rr-violet-500)" },
  { initial: "K", name: "Karthik V.", status: "Idle · last seen 2 min", color: "var(--rr-coral-400)" },
];

const ACTIVITY = [
  { icon: TrendingUp, tile: "lime", title: "Climbed 14 ranks · now #88", meta: "After Calculus · Differentiation quiz", when: "2m ago" },
  { icon: CircleCheck, tile: "violet", title: "Quiz complete · 18 / 20 correct", meta: "Calculus · Differentiation", when: "14m ago" },
  { icon: Flame, tile: "amber", title: "17-day streak saved", meta: "3 hours before reset", when: "2h ago" },
  { icon: Zap, tile: "cyan", title: "Earned 2 tokens · streak bonus", meta: "Weekly milestone · 14 days", when: "Yesterday" },
  { icon: Medal, tile: "emerald", title: "Badge unlocked · Calc Slayer", meta: "100 calculus questions at >90%", when: "Mon" },
];

const BADGES = [
  { icon: Zap, color: "violet", name: "First Token", progress: "Earned" },
  { icon: Flame, color: "amber", name: "Week Streak", progress: "Earned" },
  { icon: TrendingUp, color: "lime", name: "Calc Slayer", progress: "Earned" },
  { icon: Target, color: "cyan", name: "Sharp Eye", progress: "Earned" },
  { icon: Crown, color: "locked", name: "Top 100", progress: "88 / 100" },
  { icon: Medal, color: "locked", name: "30-day Streak", progress: "17 / 30" },
];

export default function DashboardPage() {
  const [chartTab, setChartTab] = useState("Questions");
  const { user } = useAuth();
  const { hasFeature, loading: entLoading } = useEntitlements();
  const detailedUnlocked = hasFeature('DETAILED_ANALYTICS');

  const [stats, setStats] = useState(null);
  const [weekStats, setWeekStats] = useState(null);
  const [meRank, setMeRank] = useState(null);
  const [rankHistory, setRankHistory] = useState([]);
  const [rankLoading, setRankLoading] = useState(true);
  const [pick, setPick] = useState(null);
  const [pickLoading, setPickLoading] = useState(true);
  const [garden, setGarden] = useState(null);
  const [topicAnalytics, setTopicAnalytics] = useState(null);

  // ── Greeting clock — re-render once per minute so the time stays fresh.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Stats (streak, accuracy, etc.) ─────────────────────────────────
  // Two sources:
  //   studentAPI.getStats   → all-time numbers + persistent streak fields
  //   activityAPI.getStats  → period-windowed numbers WITH deltas
  // Combined we get current values + week-over-week deltas for the strip.
  useEffect(() => {
    studentAPI.getStats()
      .then((res) => setStats(unwrap(res)?.stats ?? null))
      .catch(() => setStats(null));
    activityAPI.getStats({ period: '7d' })
      .then((res) => setWeekStats(unwrap(res) ?? null))
      .catch(() => setWeekStats(null));
    setPickLoading(true);
    studentAPI.getTodaysPick()
      .then((res) => setPick(unwrap(res)?.pick ?? null))
      .catch(() => setPick(null))
      .finally(() => setPickLoading(false));
    studentAPI.getStreakGarden(60)
      .then((res) => setGarden(unwrap(res) ?? null))
      .catch(() => setGarden(null));
    studentAPI.getTopicAnalytics(5)
      .then((res) => setTopicAnalytics(unwrap(res) ?? null))
      .catch(() => setTopicAnalytics(null));
  }, []);

  // ── Class-cohort rank + history ─────────────────────────────────────
  useEffect(() => {
    if (!user?.class) { setRankLoading(false); return; }
    setRankLoading(true);
    Promise.allSettled([
      leaderboardsAPI.getMe('CLASS_GLOBAL', user.class),
      activityAPI.getRankHistory({ period: '30d' }),
    ]).then(([meRes, histRes]) => {
      if (meRes.status === 'fulfilled') setMeRank(unwrap(meRes.value));
      if (histRes.status === 'fulfilled') setRankHistory(unwrap(histRes.value)?.points || []);
    }).finally(() => setRankLoading(false));
  }, [user?.class]);

  // ── Derived greeting copy ──────────────────────────────────────────
  const greeting = greetingFor(now);
  const firstName = user?.firstName || user?.name?.split(' ')?.[0] || 'there';
  const streak = stats?.streak ?? 0;
  const longestStreak = stats?.longestStreak ?? 0;
  const greetingLine = useMemo(() => {
    if (streak === 0) return <>Ready to start a <span className="urgent">new streak</span>?</>;
    if (longestStreak > 0 && streak < longestStreak) {
      return <>You're <span className="urgent">{longestStreak - streak} day{longestStreak - streak === 1 ? '' : 's'}</span> away from your personal best.</>;
    }
    return <>You're keeping a <span className="urgent">{streak}-day streak</span> alive.</>;
  }, [streak, longestStreak]);

  // ── Hero props ─────────────────────────────────────────────────────
  const ranked = meRank?.ranked === true;
  const trail = ranked
    ? buildHistoryTrail(rankHistory, meRank.rank)
    : [];
  const subline = user?.class
    ? [user.target?.[0], `Class ${user.class}`].filter(Boolean).join(' · ')
    : 'Your class cohort';

  return (
    <div className="main">
      {/* Greeting */}
      <div className="greeting">
        <div>
          <span className="eyebrow line">{fmtClock(now)} · {greeting}</span>
          <h1>
            Hey {firstName}. <br />
            {greetingLine}
          </h1>
        </div>
      </div>

      {/* Rank Bar Hero — class-cohort rank, fed by /api/leaderboards/CLASS_GLOBAL/<class>/me */}
      <RankBarHero
        loading={rankLoading}
        ranked={ranked}
        rank={meRank?.rank}
        delta={meRank?.delta ?? 0}
        totalStudents={meRank?.totalParticipants ?? 0}
        // percentileTop is "top X%" (lower = better); the hero copy reads
        // "ahead of N% of the field", so we flip it here.
        percentile={meRank?.percentileTop != null
          ? Math.round((100 - meRank.percentileTop) * 10) / 10
          : 0}
        history={trail}
        subline={subline}
      />

      {/* Stat cards — real data; "Study time" removed since we don't track
          per-attempt seconds reliably enough to show a card-level number. */}
      <div className="stat-grid stat-grid-3" style={{ marginTop: 24 }}>
        <StatCard
          label="Streak"
          icon={Flame}
          value={String(streak)}
          unit={streak === 1 ? " day" : " days"}
          delta={longestStreak > 0 ? `Highest ${longestStreak}` : "Just getting started"}
          deltaType={streak >= longestStreak && streak > 0 ? "up" : "warn"}
          hint={longestStreak > 0 ? `Personal best · ${longestStreak} day${longestStreak === 1 ? '' : 's'}` : "Quiz today to start one"}
          color="amber"
        />
        <StatCard
          label="Accuracy"
          icon={Target}
          value={String(weekStats?.avgAccuracy ?? stats?.accuracy ?? 0)}
          unit="%"
          delta={weekStats?.accuracyDelta != null
            ? `${weekStats.accuracyDelta >= 0 ? '+' : ''}${weekStats.accuracyDelta}`
            : '—'}
          deltaType={
            weekStats?.accuracyDelta == null ? "warn"
            : weekStats.accuracyDelta >= 0 ? "up" : "down"
          }
          hint={`7-day average · all-time ${stats?.accuracy ?? 0}%`}
          color="emerald"
        />
        <StatCard
          label="Quizzes"
          icon={CircleCheck}
          value={String(weekStats?.quizzesTaken ?? 0)}
          delta={weekStats?.quizzesDelta != null
            ? `${weekStats.quizzesDelta >= 0 ? '+' : ''}${weekStats.quizzesDelta}`
            : '—'}
          deltaType={
            weekStats?.quizzesDelta == null ? "warn"
            : weekStats.quizzesDelta > 0 ? "up"
            : weekStats.quizzesDelta < 0 ? "down" : "warn"
          }
          hint={`This week · ${stats?.quizzesAttempted ?? 0} all time`}
          color="violet"
        />
      </div>

      {/* Today's picks + Streak garden */}
      <div className="sec-title">
        <h2>Today's pick for you</h2>
        <span className="sub">{
          pick?.kind === 'resume'   ? 'A quiz you started but never finished'
          : pick?.kind === 'live'   ? 'A live contest closing soon'
          : pick?.kind === 'upcoming' ? 'An upcoming rank-rewarding contest'
          : 'Calibrated to your recent activity'
        }</span>
      </div>
      <div className="row-2">
        <TodaysPickCard pick={pick} loading={pickLoading} />

        <StreakGarden
          cells={garden?.cells}
          streak={garden?.streak ?? stats?.streak ?? 0}
          blooms={garden?.blooms}
          misses={garden?.misses}
          totalMinutes={garden?.totalMinutes}
          loading={!garden}
        />
      </div>

      {/* Topic insights — shown up to 5 each for everyone; the deep
          /app/analytics page is gated behind DETAILED_ANALYTICS (Pro). */}
      <div className="sec-title">
        <h2>Topic insights</h2>
        {!entLoading && (
          detailedUnlocked ? (
            <Link
              to="/app/analytics"
              style={{ fontSize: 13, color: "var(--rr-violet-500)", fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              View detailed analytics →
            </Link>
          ) : (
            <Link
              to="/app/analytics"
              title="Detailed analytics is a Pro feature"
              style={{ fontSize: 13, color: "var(--rr-fg-muted)", fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Lock size={12} /> View detailed analytics
            </Link>
          )
        )}
      </div>
      <div className="row-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <TopicInsightCard
          tone="weak"
          title="Needs work"
          subtitle="Lowest accuracy topics — start here"
          topics={topicAnalytics?.weak}
          loading={!topicAnalytics}
        />
        <TopicInsightCard
          tone="strong"
          title="Crushing it"
          subtitle="Your sharpest topics — keep them sharp"
          topics={topicAnalytics?.strong}
          loading={!topicAnalytics}
        />
      </div>

      {/* Chart + Friends */}
      <div className="sec-title">
        <h2>This week</h2>
        <Link to="/app/activity" style={{ fontSize: 13, color: "var(--rr-violet-500)", fontWeight: 500, textDecoration: "none" }}>
          View full activity →
        </Link>
      </div>
      <div className="row-2" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
        <div className="dcard chart-card">
          <div className="head">
            <div>
              <h3>Questions solved</h3>
              <span className="sub">412 this week · daily avg <b style={{ color: "var(--rr-fg)" }}>58</b></span>
            </div>
            <TimeTabs
              tabs={["Quizzes", "Questions", "Accuracy"]}
              active={chartTab}
              onChange={setChartTab}
            />
          </div>
          <div className="chart-area">
            {CHART_DATA.map(bar => (
              <div key={bar.day} className={`chart-bar${bar.isToday ? " today" : ""}`}>
                <div className="bar" style={{ height: bar.height }}>
                  <span className="value">{bar.value}</span>
                </div>
                <span className="label">{bar.day}</span>
              </div>
            ))}
          </div>
          <div className="chart-foot">
            <span>Daily target: <b>50 questions</b></span>
            <span><b style={{ color: "var(--rr-emerald-500)" }}>+16%</b> vs last week</span>
          </div>
        </div>

        <div className="dcard friends-panel">
          <div className="head">
            <div>
              <h3>Friends studying now</h3>
              <span className="sub">4 of 12 online</span>
            </div>
            <Link to="/app/quizzes" className="action"><Users size={14} />View all</Link>
          </div>
          <div className="friends-list">
            {FRIENDS.map(f => (
              <div key={f.name} className="friend-row">
                <div className="av online" style={{ background: f.color }}>{f.initial}</div>
                <div className="info">
                  <span className="n">{f.name}</span>
                  <span className="s">{f.status}</span>
                </div>
                <button className="duel"><Swords size={11} />Duel</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity + Badges */}
      <div className="sec-title">
        <h2>Recent activity</h2>
      </div>
      <div className="row-2" style={{ gridTemplateColumns: "1fr 1.2fr" }}>
        <div className="dcard">
          <div className="head">
            <div>
              <h3>What happened</h3>
              <span className="sub">Last 24 hours</span>
            </div>
          </div>
          <div className="activity">
            {ACTIVITY.map((a, i) => (
              <div key={i} className="activity-item">
                <div className={`icon-tile ${a.tile}`}><a.icon /></div>
                <div className="text">
                  <span className="title">{a.title}</span>
                  <span className="meta">{a.meta}</span>
                </div>
                <span className="when">{a.when}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dcard">
          <div className="head">
            <div>
              <h3>Achievements</h3>
              <span className="sub"><b style={{ color: "var(--rr-fg)" }}>8</b> of 24 unlocked</span>
            </div>
            <Link to="/app/activity" className="action">See all<ArrowRight size={14} /></Link>
          </div>
          <div className="badge-shelf">
            {BADGES.map(b => (
              <div key={b.name} className={`bg-badge ${b.color}`}>
                <div className="ring"><b.icon /></div>
                <span className="name">{b.name}</span>
                <span className="progress">{b.progress}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pro nudge */}
      <div className="pro-nudge">
        <div className="left">
          <div className="lbl">★ Free plan · 12 tokens left</div>
          <h3>You've answered 412 questions this week. Pro gives you the rest of the year.</h3>
          <p>50 tokens a month, every previous-year paper, advanced analytics — and the right to never count tokens again.</p>
        </div>
        <div className="right">
          <Link to="/app/pricing" className="btn btn-ghost btn-lg" style={{ color: "#FAFAF7", border: "1px solid rgba(255,255,255,0.15)" }}>
            See plans
          </Link>
          <Link to="/app/pricing" className="btn btn-lime btn-lg">Go Pro · ₹299</Link>
        </div>
      </div>
    </div>
  );
}

// Maps Quiz.difficulty enum-ish strings → 1–5 pill count.
const DIFF_PILL_MAP = { Easy: 1, Medium: 3, Hard: 4, Expert: 5 };

function TopicInsightCard({ tone, title, subtitle, topics, loading }) {
  const color = tone === 'weak' ? 'var(--rr-coral-500)' : 'var(--rr-emerald-500)';
  return (
    <div className="dcard">
      <div className="head">
        <div>
          <h3 style={{ color }}>{title}</h3>
          <span className="sub">{subtitle}</span>
        </div>
      </div>
      <div className="topic-list">
        {loading ? (
          // Skeleton rows so the card doesn't pop height when data arrives.
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`topic-row ${tone}`} style={{ opacity: 0.4 }}>
              <span className="name">…</span>
            </div>
          ))
        ) : !topics || topics.length === 0 ? (
          <div className="topic-row" style={{ color: 'var(--rr-fg-muted)' }}>
            <span className="name">
              Complete a few quizzes to populate {tone === 'weak' ? 'weak' : 'strong'} topics.
            </span>
          </div>
        ) : (
          topics.map((t) => (
            <div key={t.topic} className={`topic-row ${tone}`}>
              <span className="name">{t.subject ? `${t.subject} · ${t.topic}` : t.topic}</span>
              <span className="qcount">{t.attempts} Qs</span>
              <span className="acc">{t.accuracy}%</span>
              <div className="pbar"><div className="pfill" style={{ width: `${t.accuracy}%` }} /></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TodaysPickCard({ pick, loading }) {
  if (loading) {
    return (
      <div className="todays-pick">
        <div className="tp-top">
          <span className="tag"><Sparkles size={12} />Suggested</span>
        </div>
        <div className="tp-body">
          <h2 style={{ opacity: 0.6 }}>Picking the best quiz for you…</h2>
        </div>
      </div>
    );
  }
  if (!pick) {
    return (
      <div className="todays-pick">
        <div className="tp-top">
          <span className="tag"><Sparkles size={12} />Suggested</span>
        </div>
        <div className="tp-body">
          <h2>No quizzes to suggest right now.</h2>
          <p className="desc">Once new quizzes are published or contests open, you'll see them here.</p>
          <div className="tp-cta">
            <Link to="/app/quizzes" className="btn btn-accent"><Play size={14} />Browse quizzes</Link>
          </div>
        </div>
      </div>
    );
  }

  const cost = pick.attemptCost ?? 1;
  const minutes = Math.round(pick.timeLimitMins || 0);
  const duration = minutes >= 60 && minutes % 60 === 0
    ? `${minutes / 60} hour${minutes / 60 > 1 ? "s" : ""}`
    : `~${minutes} min`;
  const diffLevel = DIFF_PILL_MAP[pick.difficulty] ?? 3;
  const topic = [pick.subject, pick.chapter, pick.topic].filter(Boolean).join(" · ");

  const tagLabel = pick.kind === 'resume'   ? 'Resume in progress'
                : pick.kind === 'live'      ? 'Live · ends soon'
                : pick.kind === 'upcoming'  ? 'Upcoming contest'
                : 'Suggested';
  const ctaLabel = pick.kind === 'resume'   ? 'Resume quiz'
                : pick.kind === 'upcoming'  ? 'View quiz'
                : 'Start quiz';
  const ctaSuffix = cost === 0 ? 'Free' : `${cost} token${cost === 1 ? '' : 's'}`;
  const href = `/app/quizzes/${pick.id}/session`;

  return (
    <div className="todays-pick">
      <div className="tp-top">
        <span className="tag"><Sparkles size={12} />{tagLabel}</span>
        <span className="badge violet"><Zap size={12} />{ctaSuffix}</span>
      </div>
      <div className="tp-body">
        {topic && <div className="topic">{topic}</div>}
        <h2>{pick.title}</h2>
        {pick.description && <p className="desc">{pick.description}</p>}
        <div className="tp-meta">
          <span><Clock size={13} />{duration}</span>
          <span><CircleCheck size={13} />{pick.totalQuestions} questions</span>
          {pick.rankRewarding && <span><TrendingUp size={13} />Rank-rewarding</span>}
          <span className="diff">
            <Zap size={13} />
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className={`pill${i <= diffLevel ? ' on' : ''}`} />
            ))}
            {pick.difficulty && <span style={{ marginLeft: 4 }}>{pick.difficulty}</span>}
          </span>
        </div>
        <div className="tp-cta">
          <Link to={href} className="btn btn-accent">
            <Play size={14} />{ctaLabel} · {ctaSuffix}
          </Link>
        </div>
      </div>
    </div>
  );
}

function TimeTabs({ tabs, active, onChange }) {
  return (
    <div className="time-tabs">
      {tabs.map(tab => (
        <button
          key={tab}
          className={tab === active ? "on" : ""}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
