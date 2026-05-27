import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Flame, Target, CircleCheck, Clock, ArrowUp, ArrowDown,
  Sparkles, Play, Search, TrendingUp, Zap, Medal,
  Users, Swords, Crown, ArrowRight,
} from "lucide-react";
import RankBarHero from "../../components/student/RankBarHero";
import StreakGarden from "../../components/student/StreakGarden";
import StatCard from "../../components/ui/StatCard";
import "./DashboardPage.css";

const STREAK_DATA = [
  0,1,2,3,4,4,3,2,3,4,4,4,3,4,4,4,4,4,3,4,
  4,4,4,3,2,3,4,4,4,4,4,4,4,4,3,4,4,4,4,4,
  0,0,1,2,3,4,4,4,4,4,4,4,4,4,3,4,4,4,4,4,
];

const CHART_DATA = [
  { day: "Mon", value: 28, height: "35%" },
  { day: "Tue", value: 52, height: "62%" },
  { day: "Wed", value: 41, height: "50%" },
  { day: "Thu", value: 66, height: "78%" },
  { day: "Fri", value: 58, height: "70%" },
  { day: "Sat", value: 78, height: "92%" },
  { day: "Today", value: 89, height: "100%", isToday: true },
];

const WEAK_TOPICS = [
  { name: "Calculus · Limits", qs: 22, acc: 52 },
  { name: "Mechanics · Rotational dynamics", qs: 18, acc: 58 },
  { name: "Organic Chem · Aldol condensation", qs: 14, acc: 64 },
  { name: "Coordinate geometry · Conic sections", qs: 11, acc: 68 },
];

const STRONG_TOPICS = [
  { name: "Algebra · Quadratic equations", qs: 48, acc: 98 },
  { name: "Thermodynamics · First law", qs: 36, acc: 96 },
  { name: "Inorganic Chem · Periodic table", qs: 52, acc: 94 },
  { name: "Trigonometry · Identities", qs: 29, acc: 91 },
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
  const [insightTab, setInsightTab] = useState("7 days");
  const [chartTab, setChartTab] = useState("Questions");

  return (
    <div className="main">
      {/* Greeting */}
      <div className="greeting">
        <div>
          <span className="eyebrow line">Tuesday · 8:42 AM · Good morning</span>
          <h1>
            Hey Astitva. <br />
            You're one quiz away from a <span className="urgent">18-day streak</span>.
          </h1>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><Search size={14} />Browse</button>
          <button className="btn btn-accent"><Play size={14} />Quick practice</button>
        </div>
      </div>

      {/* Rank Bar Hero */}
      <RankBarHero rank={88} delta={14} totalStudents={12481} percentile={71.8} />

      {/* Stat cards */}
      <div className="stat-grid" style={{ marginTop: 24 }}>
        <StatCard
          label="Streak"
          icon={Flame}
          value="17"
          unit=" days"
          delta="17 → 18 today"
          deltaType="warn"
          hint="Highest: 24 days · Feb"
          color="amber"
        />
        <StatCard
          label="Accuracy"
          icon={Target}
          value="92.4"
          unit="%"
          delta="+4.2"
          deltaType="up"
          hint="7-day average · 412 questions"
          color="emerald"
        />
        <StatCard
          label="Questions"
          icon={CircleCheck}
          value="412"
          delta="+38"
          deltaType="up"
          hint="This week · 1,247 all time"
          color="violet"
        />
        <StatCard
          label="Study time"
          icon={Clock}
          value="4"
          unit="h 22m"
          delta="-12m"
          deltaType="down"
          hint="This week · daily avg 38m"
          color="cyan"
        />
      </div>

      {/* Today's picks + Streak garden */}
      <div className="sec-title">
        <h2>Today's picks for you</h2>
        <span className="sub">Calibrated to yesterday's weak spots</span>
      </div>
      <div className="row-2">
        <div className="todays-pick">
          <div className="tp-top">
            <span className="tag"><Sparkles size={12} />Suggested · weak topic</span>
            <span className="badge violet"><Zap size={12} />1 token</span>
          </div>
          <div className="tp-body">
            <div className="topic">Mathematics · Calculus · Chapter 5</div>
            <h2>Limits &amp; continuity — the questions you missed yesterday, harder.</h2>
            <p className="desc">
              A 20-question set built from your two lowest-accuracy topics this week.
              Time-pressured. Auto-graded. Solutions included.
            </p>
            <div className="tp-meta">
              <span><Clock size={13} />~12 min</span>
              <span><CircleCheck size={13} />20 questions</span>
              <span><TrendingUp size={13} />Avg. +12 ranks</span>
              <span className="diff">
                <Zap size={13} />
                <span className="pill on"></span>
                <span className="pill on"></span>
                <span className="pill on"></span>
                <span className="pill"></span>
                <span className="pill"></span>
                <span style={{ marginLeft: 4 }}>Hard</span>
              </span>
            </div>
            <div className="tp-cta">
              <button className="btn btn-accent"><Play size={14} />Start quiz · 1 token</button>
            </div>
          </div>
        </div>

        <StreakGarden data={STREAK_DATA} streak={17} misses={3} />
      </div>

      {/* Topic insights */}
      <div className="sec-title">
        <h2>Topic insights</h2>
        <TimeTabs
          tabs={["Today", "7 days", "30 days"]}
          active={insightTab}
          onChange={setInsightTab}
        />
      </div>
      <div className="row-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="dcard">
          <div className="head">
            <div>
              <h3 style={{ color: "var(--rr-coral-500)" }}>Needs work</h3>
              <span className="sub">Below 70% — start here</span>
            </div>
            <Link to="/app/quizzes" className="action">Practice all<ArrowRight size={14} /></Link>
          </div>
          <div className="topic-list">
            {WEAK_TOPICS.map(t => (
              <div key={t.name} className="topic-row weak">
                <span className="name">{t.name}</span>
                <span className="qcount">{t.qs} Qs</span>
                <span className="acc">{t.acc}%</span>
                <div className="pbar"><div className="pfill" style={{ width: `${t.acc}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="dcard">
          <div className="head">
            <div>
              <h3 style={{ color: "var(--rr-emerald-500)" }}>Crushing it</h3>
              <span className="sub">Above 90% — keep it sharp</span>
            </div>
            <Link to="/app/quizzes" className="action">Challenge a friend<ArrowRight size={14} /></Link>
          </div>
          <div className="topic-list">
            {STRONG_TOPICS.map(t => (
              <div key={t.name} className="topic-row strong">
                <span className="name">{t.name}</span>
                <span className="qcount">{t.qs} Qs</span>
                <span className="acc">{t.acc}%</span>
                <div className="pbar"><div className="pfill" style={{ width: `${t.acc}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
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
          <Link to="/app/pricing" className="btn btn-ghost btn-lg" style={{ color: "var(--rr-paper)", border: "1px solid rgba(255,255,255,0.15)" }}>
            See plans
          </Link>
          <Link to="/app/pricing" className="btn btn-lime btn-lg">Go Pro · ₹299</Link>
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
