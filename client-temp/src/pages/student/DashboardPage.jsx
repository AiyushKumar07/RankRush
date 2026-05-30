import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Flame, Target, CircleCheck, Clock,
  Sparkles, Play, TrendingUp, Zap, Medal,
  Users, Crown, ArrowRight, Lock,
  // Recent-activity icon set (mirrors ActivityPage's TYPE_RENDER)
  CircleDot, CircleSlash, Coins, ShoppingBag, RefreshCw,
  Gift, Pencil, UserPlus, Loader2,
  // Badge icons referenced by Badge.icon strings from the seed
  BookOpen, Library, Award, Rocket, Trophy, Sigma, Atom, FlaskConical, Leaf,
} from "lucide-react";
import RankBarHero from "../../components/student/RankBarHero";
import StreakGarden from "../../components/student/StreakGarden";
import StatCard from "../../components/ui/StatCard";
import { useAuth } from "../../context/AuthContext";
import { useEntitlements } from "../../hooks/useEntitlements";
import {
  activityAPI, badgesAPI, leaderboardsAPI, studentAPI,
  subscriptionPlansAPI, tokensAPI,
} from "../../services/api";
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

export default function DashboardPage() {
  const [chartTab, setChartTab] = useState("Questions");
  const { user } = useAuth();
  const { hasFeature, loading: entLoading, planName } = useEntitlements();
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
  const [weeklyChart, setWeeklyChart] = useState(null);
  const [recentFeed, setRecentFeed] = useState(null);
  const [badges, setBadges] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [proPlan, setProPlan] = useState(null);

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
    studentAPI.getWeeklyChart()
      .then((res) => setWeeklyChart(unwrap(res) ?? null))
      .catch(() => setWeeklyChart(null));
    activityAPI.getFeed({ limit: 7 })
      .then((res) => setRecentFeed(unwrap(res)?.items || []))
      .catch(() => setRecentFeed([]));
    badgesAPI.list()
      .then((res) => setBadges(unwrap(res) ?? null))
      .catch(() => setBadges(null));
    // Pro nudge needs live token balance + the cheapest Pro pricing.
    tokensAPI.getBalance()
      .then((res) => setTokenBalance(unwrap(res)?.balance ?? res?.balance ?? null))
      .catch(() => setTokenBalance(null));
    subscriptionPlansAPI.list()
      .then((res) => {
        const plans = unwrap(res)?.plans ?? unwrap(res) ?? [];
        const pro = plans.find((p) => /pro/i.test(p?.name || ''));
        setProPlan(pro ?? null);
      })
      .catch(() => setProPlan(null));
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
        <WeeklyChartCard
          chart={weeklyChart}
          activeTab={chartTab}
          onTabChange={setChartTab}
        />
        <FriendsComingSoonCard />
      </div>

      {/* Activity + Badges */}
      <div className="sec-title">
        <h2>Recent activity</h2>
      </div>
      <div className="row-2" style={{ gridTemplateColumns: "1fr 1.2fr" }}>
        <RecentActivityCard items={recentFeed} />
        <AchievementsCard badges={badges} />
      </div>

      {/* Pro nudge — hides itself for Pro users. */}
      <ProNudge
        weeklyQuestions={weeklyChart?.totals?.questions ?? 0}
        tokenBalance={tokenBalance}
        proPlan={proPlan}
        unlocked={detailedUnlocked}
        planName={planName}
      />
    </div>
  );
}

function ProNudge({ weeklyQuestions, tokenBalance, proPlan, unlocked, planName }) {
  // Hide entirely for Pro/unlocked users — no upsell when they've already
  // converted. Keeps the dashboard from feeling spammy on the way back.
  if (unlocked) return null;

  // Cheapest cadence wins for the CTA price ("Go Pro · ₹299" reads as the
  // monthly entry-point even though annual is the better deal).
  const cheapest = proPlan?.pricings?.length
    ? [...proPlan.pricings].sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0]
    : null;
  const ctaPrice = cheapest?.price ? `₹${cheapest.price}` : null;

  // Body copy adapts to the current plan slug.
  const planLabel = planName || 'Free';
  const tokenLine = tokenBalance != null
    ? `${tokenBalance} token${tokenBalance === 1 ? '' : 's'} left`
    : null;
  const headline = weeklyQuestions > 0
    ? `You've answered ${weeklyQuestions} question${weeklyQuestions === 1 ? '' : 's'} this week. Pro gives you the rest of the year.`
    : `Pro unlocks the whole catalogue, every previous-year paper, and detailed analytics.`;

  return (
    <div className="pro-nudge">
      <div className="left">
        <div className="lbl">
          ★ {planLabel} plan{tokenLine ? ` · ${tokenLine}` : ''}
        </div>
        <h3>{headline}</h3>
        <p>50 tokens a month, every previous-year paper, advanced analytics — and the right to never count tokens again.</p>
      </div>
      <div className="right">
        <Link to="/app/pricing" className="btn btn-ghost btn-lg" style={{ color: "#FAFAF7", border: "1px solid rgba(255,255,255,0.15)" }}>
          See plans
        </Link>
        <Link to="/app/pricing" className="btn btn-lime btn-lg">
          Go Pro{ctaPrice ? ` · ${ctaPrice}` : ''}
        </Link>
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
  const minutes = pick.timeLimitMins || 0;
  const duration = minutes >= 60 && minutes % 60 === 0
    ? `${minutes / 60} hour${minutes / 60 > 1 ? "s" : ""}`
    : `${minutes} min`;
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
  const href = pick.kind === 'resume'
    ? `/app/quizzes/${pick.id}/session`
    : `/app/quizzes/${pick.id}/instructions`;

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

// Heading copy + value formatter for each chart tab.
const CHART_TAB_META = {
  Quizzes:  { heading: 'Quizzes completed', unit: '',  series: 'quizzes',   format: (n) => n },
  Questions:{ heading: 'Questions solved',  unit: '',  series: 'questions', format: (n) => n },
  Accuracy: { heading: 'Daily accuracy',    unit: '%', series: 'accuracy',  format: (n) => `${n}%` },
};

function WeeklyChartCard({ chart, activeTab, onTabChange }) {
  const meta = CHART_TAB_META[activeTab] ?? CHART_TAB_META.Questions;
  const cells = chart?.cells ?? [];
  const totals = chart?.totals;
  const dailyAvg = chart?.dailyAvg;

  // Scale bars to the tallest value in the current series so short days
  // don't disappear and tall days don't clip.
  const maxVal = Math.max(1, ...cells.map((c) => c[meta.series] ?? 0));

  // Headline copy: total + daily-avg for Quizzes/Questions; week avg for Accuracy.
  const headlineTotal = activeTab === 'Accuracy'
    ? `${totals?.accuracy ?? 0}% week avg`
    : `${totals?.[meta.series] ?? 0} this week`;
  const headlineAvg = activeTab === 'Accuracy'
    ? null
    : `daily avg ${dailyAvg?.[meta.series] ?? 0}`;

  return (
    <div className="dcard chart-card">
      <div className="head">
        <div>
          <h3>{meta.heading}</h3>
          <span className="sub">
            {headlineTotal}
            {headlineAvg && <> · {headlineAvg.split(' ').slice(0, 2).join(' ')} <b style={{ color: 'var(--rr-fg)' }}>{headlineAvg.split(' ').slice(2).join(' ')}</b></>}
          </span>
        </div>
        <TimeTabs
          tabs={['Quizzes', 'Questions', 'Accuracy']}
          active={activeTab}
          onChange={onTabChange}
        />
      </div>
      <div className="chart-area">
        {cells.length === 0 ? (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--rr-fg-muted)', fontSize: 13 }}>
            No activity in the last 7 days.
          </div>
        ) : (
          cells.map((c) => {
            const val = c[meta.series] ?? 0;
            // Use ~6% minimum so empty days still leave a stub bar visible.
            const heightPct = val > 0 ? Math.max(6, Math.round((val / maxVal) * 100)) : 4;
            return (
              <div key={c.date} className={`chart-bar${c.isToday ? ' today' : ''}`}>
                <div className="bar" style={{ height: `${heightPct}%` }}>
                  <span className="value">{meta.format(val)}</span>
                </div>
                <span className="label">{c.label}</span>
              </div>
            );
          })
        )}
      </div>
      <div className="chart-foot">
        {activeTab === 'Questions'
          ? <span>Daily target: <b>{chart?.dailyTarget ?? 50} questions</b></span>
          : <span>{activeTab === 'Accuracy' ? 'Volume-weighted across the week' : 'Last 7 days'}</span>}
        {chart?.wowPctQuestions != null && activeTab === 'Questions' && (
          <span>
            <b style={{ color: chart.wowPctQuestions >= 0 ? 'var(--rr-emerald-500)' : 'var(--rr-coral-500)' }}>
              {chart.wowPctQuestions >= 0 ? '+' : ''}{chart.wowPctQuestions}%
            </b>{' '}vs last week
          </span>
        )}
      </div>
    </div>
  );
}

function FriendsComingSoonCard() {
  return (
    <div className="dcard friends-panel">
      <div className="head">
        <div>
          <h3>Friends studying now</h3>
          <span className="sub">A social layer for study buddies + duels</span>
        </div>
        <span
          style={{
            fontFamily: 'var(--rr-font-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--rr-violet-500)',
            background: 'color-mix(in oklab, var(--rr-violet-500) 10%, transparent)',
            border: '1px solid color-mix(in oklab, var(--rr-violet-500) 25%, transparent)',
            padding: '4px 8px',
            borderRadius: 999,
          }}
        >
          Coming soon
        </span>
      </div>
      <div style={{
        flex: 1, minHeight: 220,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12, padding: 20, textAlign: 'center', color: 'var(--rr-fg-muted)',
      }}>
        <Users size={36} style={{ color: 'var(--rr-fg-dim)' }} />
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, maxWidth: 280 }}>
          Add friends, see who's online, and challenge them to a head-to-head duel.
          We're shipping this next — leaderboards and the contest engine are already live.
        </p>
        <Link
          to="/app/leaderboards"
          style={{ fontSize: 12, color: 'var(--rr-violet-500)', textDecoration: 'none', fontWeight: 500 }}
        >
          Browse leaderboards instead →
        </Link>
      </div>
    </div>
  );
}

// ── Recent activity (real ActivityEvent feed, last 7) ──────────────
// Maps backend event types → icon + tile colour. Stays in sync with the
// ActivityPage's TYPE_RENDER table so the same event looks the same on
// both surfaces.
const ACTIVITY_RENDER = {
  QUIZ_COMPLETED:     { Icon: CircleCheck, tile: 'violet'  },
  QUIZ_STARTED:       { Icon: CircleDot,   tile: 'cyan'    },
  QUIZ_ABANDONED:     { Icon: CircleSlash, tile: 'coral'   },
  RANK_CHANGED:       { Icon: TrendingUp,  tile: 'lime'    },
  TOKEN_CREDITED:     { Icon: Coins,       tile: 'amber'   },
  TOKEN_DEBITED:      { Icon: Coins,       tile: 'amber'   },
  TOKEN_PURCHASED:    { Icon: ShoppingBag, tile: 'cyan'    },
  BADGE_UNLOCKED:     { Icon: Medal,       tile: 'emerald' },
  STREAK_DAY:         { Icon: Flame,       tile: 'amber'   },
  STREAK_MILESTONE:   { Icon: Flame,       tile: 'amber'   },
  STREAK_BROKEN:      { Icon: Flame,       tile: 'coral'   },
  PLAN_PURCHASED:     { Icon: Crown,       tile: 'lime'    },
  PLAN_CANCELLED:     { Icon: CircleSlash, tile: 'coral'   },
  PLAN_REFRESHED:     { Icon: RefreshCw,   tile: 'cyan'    },
  REFERRAL_CONVERTED: { Icon: Gift,        tile: 'lime'    },
  PROFILE_UPDATED:    { Icon: Pencil,      tile: 'cyan'    },
  ACCOUNT_CREATED:    { Icon: UserPlus,    tile: 'violet'  },
};

function activityWhen(date) {
  if (!date) return '';
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function RecentActivityCard({ items }) {
  return (
    <div className="dcard">
      <div className="head">
        <div>
          <h3>What happened</h3>
          <span className="sub">Last 7 events</span>
        </div>
        <Link to="/app/activity" className="action">Full timeline<ArrowRight size={14} /></Link>
      </div>
      <div className="activity">
        {items == null ? (
          <div style={{ padding: '24px 0', color: 'var(--rr-fg-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader2 size={14} className="quiz-spin" /> Loading recent activity…
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '24px 0', color: 'var(--rr-fg-muted)', fontSize: 13 }}>
            No activity yet — finish a quiz to see your timeline here.
          </div>
        ) : (
          items.map((it) => {
            const meta = ACTIVITY_RENDER[it.type] ?? { Icon: CircleCheck, tile: 'violet' };
            const Icon = meta.Icon;
            return (
              <div key={it.id} className="activity-item">
                <div className={`icon-tile ${meta.tile}`}><Icon /></div>
                <div className="text">
                  <span className="title">{it.title}</span>
                  {it.meta && <span className="meta">{it.meta}</span>}
                </div>
                <span className="when">{activityWhen(it.occurredAt)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Achievements card ─────────────────────────────────────────────
// Backend stores Badge.icon as a string (lucide name). Map to the
// imported component; fall back to Medal if unknown so a future
// admin-authored badge can't break the dashboard.
const BADGE_ICONS = {
  Sparkles, CircleCheck, Crown, Flame, BookOpen, Library, Award, Rocket,
  Target, Trophy, Medal, TrendingUp, Zap, Coins, Sigma, Atom, FlaskConical, Leaf,
};

function AchievementsCard({ badges }) {
  // Sorting: unlocked first, then closest-to-unlock, then everything
  // else. We show the top 6 — the dashboard tile, not the catalogue.
  const items = badges?.items ?? [];
  const top = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        if (a.unlocked && b.unlocked) {
          return new Date(b.unlockedAt ?? 0).getTime() - new Date(a.unlockedAt ?? 0).getTime();
        }
        return (b.progress ?? 0) - (a.progress ?? 0);
      })
      .slice(0, 6);
  }, [items]);

  return (
    <div className="dcard">
      <div className="head">
        <div>
          <h3>Achievements</h3>
          <span className="sub">
            {badges?.summary
              ? <><b style={{ color: 'var(--rr-fg)' }}>{badges.summary.unlocked}</b> of {badges.summary.total} unlocked</>
              : 'Loading…'}
          </span>
        </div>
        <Link to="/app/badges" className="action">See all<ArrowRight size={14} /></Link>
      </div>
      <div className="badge-shelf">
        {badges == null ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-badge locked" style={{ opacity: 0.4 }}>
              <div className="ring" />
              <span className="name">—</span>
              <span className="progress">…</span>
            </div>
          ))
        ) : top.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '32px 12px', textAlign: 'center', color: 'var(--rr-fg-muted)', fontSize: 13 }}>
            No badges configured yet.
          </div>
        ) : (
          top.map((b) => {
            const Icon = BADGE_ICONS[b.icon] ?? Medal;
            const colorClass = b.unlocked ? (b.tone || 'violet') : 'locked';
            const progressText = b.unlocked
              ? 'Earned'
              : `${formatProgress(b.current)} / ${formatProgress(b.target)}`;
            return (
              <div
                key={b.id}
                className={`bg-badge ${colorClass}`}
                title={b.description}
              >
                <div className="ring"><Icon /></div>
                <span className="name">{b.name}</span>
                <span className="progress">{progressText}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatProgress(n) {
  if (n == null) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(Math.round(n));
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
