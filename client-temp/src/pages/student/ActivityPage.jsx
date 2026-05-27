import React, { useState, useMemo } from 'react'
import {
  CircleCheck, Target, TrendingUp, Flame, ArrowUp, Download,
  Coins, Gift, Medal, UserPlus
} from 'lucide-react'
import './ActivityPage.css'

const PERIOD_TABS = ['Today', '7 days', '30 days', '90 days', 'All time']

const TIMELINE_FILTERS = [
  { label: 'All', count: 28 },
  { label: 'Quizzes', count: 14, icon: CircleCheck },
  { label: 'Rank-ups', count: 6, icon: TrendingUp },
  { label: 'Tokens', count: 5, icon: Coins },
  { label: 'Badges', count: 2, icon: Medal },
  { label: 'Streak', count: 1, icon: Flame },
]

const GARDEN_DATA = [
  0,0,1,2,3,3,2,1,0,0,1,1,2,3,4,4,3,2,1,0,0,1,2,3,3,4,
  0,1,2,3,4,4,4,3,2,1,2,3,4,4,4,4,4,3,2,1,2,3,4,4,4,4,
  3,4,4,4,4,4,4,4,4,4,3,2,1,0,1,2,3,4,4,4,4,4,4,4,4,4
]
const BLOOMS = new Set([10, 30, 52, 67])

const DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN']

function intensity(d, h) {
  const baseEvening = h >= 18 && h <= 21 ? 3 : (h >= 22 || h <= 7 ? 0 : (h >= 8 && h <= 11 ? 2 : 1))
  const weekendBoost = (d === 5 || d === 6) ? (h >= 14 && h <= 16 ? 1 : 0) : 0
  const random = (d * 7 + h * 3) % 5
  const val = Math.min(4, baseEvening + weekendBoost + (random === 0 ? 1 : 0) - (random === 4 ? 1 : 0))
  return Math.max(0, val)
}

function hourLabel(h) {
  if (h % 3 !== 0) return ''
  if (h === 0) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

export default function ActivityPage() {
  const [activePeriod, setActivePeriod] = useState(1)
  const [activeFilter, setActiveFilter] = useState(0)

  const heatmapRows = useMemo(() => {
    return DAYS.map((day, di) => {
      const cells = Array.from({ length: 24 }, (_, h) => intensity(di, h))
      return { day, cells }
    })
  }, [])

  return (
    <div className="main">

      <div className="page-head">
        <div className="crumb">/ Activity</div>
        <h1>Activity</h1>
        <p className="sub">Every quiz, every climb, every token. The receipt of your study habit.</p>
      </div>

      <div className="period-row">
        <div className="period-tabs">
          {PERIOD_TABS.map((t, i) => (
            <button key={t} className={activePeriod === i ? 'on' : ''} onClick={() => setActivePeriod(i)}>{t}</button>
          ))}
        </div>
        <button className="export-btn"><Download size={14} />Export CSV</button>
      </div>

      <div className="stat-strip">
        <div className="cell">
          <div className="lbl"><CircleCheck size={12} />Quizzes taken</div>
          <div className="v violet">14</div>
          <span className="delta"><ArrowUp size={12} />+5 vs prev week</span>
        </div>
        <div className="cell">
          <div className="lbl"><Target size={12} />Avg. accuracy</div>
          <div className="v emerald">92.4<small>%</small></div>
          <span className="delta"><ArrowUp size={12} />+4.2 pts</span>
        </div>
        <div className="cell">
          <div className="lbl"><TrendingUp size={12} />Rank movement</div>
          <div className="v cyan">+159</div>
          <span className="delta"><ArrowUp size={12} />#247 → #88</span>
        </div>
        <div className="cell">
          <div className="lbl"><Flame size={12} />Streak days</div>
          <div className="v amber">17</div>
          <span className="delta"><ArrowUp size={12} />4 days to next bonus</span>
        </div>
      </div>

      {/* Rank-history chart + Streak garden */}
      <div className="row-2">
        <div className="dcard">
          <div className="head">
            <div>
              <h3>Rank history · 7 days</h3>
              <span className="sub">#247 → #88 · biggest jump on May 24</span>
            </div>
            <span style={{ fontFamily: 'var(--rr-font-mono)', fontSize: 10, color: 'var(--rr-violet-500)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>↑ better rank</span>
          </div>
          <div className="rank-chart">
            <svg viewBox="0 0 700 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="vGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#6D5BFF" stopOpacity="0.28" />
                  <stop offset="1" stopColor="#6D5BFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g className="grid">
                <line x1="0" x2="700" y1="0" y2="0"/>
                <line x1="0" x2="700" y1="50" y2="50"/>
                <line x1="0" x2="700" y1="100" y2="100"/>
                <line x1="0" x2="700" y1="150" y2="150"/>
                <line x1="0" x2="700" y1="200" y2="200"/>
              </g>
              <path className="area" d="M0 180 L100 168 L200 152 L300 130 L400 90 L500 70 L600 50 L700 30 L700 200 L0 200 Z" />
              <path className="line" d="M0 180 L100 168 L200 152 L300 130 L400 90 L500 70 L600 50 L700 30" />
              <circle className="pt" cx="0" cy="180" r="4"/>
              <circle className="pt" cx="100" cy="168" r="4"/>
              <circle className="pt" cx="200" cy="152" r="4"/>
              <circle className="pt" cx="300" cy="130" r="4"/>
              <circle className="pt" cx="400" cy="90" r="4"/>
              <circle className="pt" cx="500" cy="70" r="4"/>
              <circle className="pt" cx="600" cy="50" r="4"/>
              <circle className="pt now" cx="700" cy="30" r="6"/>
            </svg>
            <span className="lbl-now">#88 ★</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--rr-font-mono)', fontSize: 10, color: 'var(--rr-fg-dim)', padding: '0 4px' }}>
            <span>May 21<br /><b style={{ fontFamily: 'var(--rr-font-display)', fontWeight: 700, fontSize: 11, color: 'var(--rr-fg-2)' }}>#247</b></span>
            <span>May 22</span>
            <span>May 23</span>
            <span>May 24<br /><b style={{ fontFamily: 'var(--rr-font-display)', fontWeight: 700, fontSize: 11, color: 'var(--rr-fg-2)' }}>#142</b></span>
            <span>May 25</span>
            <span>May 26</span>
            <span>Today<br /><b style={{ fontFamily: 'var(--rr-font-display)', fontWeight: 700, fontSize: 11, color: 'var(--rr-lime-500)' }}>#88</b></span>
          </div>
        </div>

        <div className="dcard garden-card">
          <div className="head">
            <div>
              <h3>Streak garden</h3>
              <span className="sub">17-day run · 2 blooms · 78 days</span>
            </div>
            <span style={{ fontFamily: 'var(--rr-font-mono)', fontSize: 10, color: 'var(--rr-amber-500)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>🔥 17 days</span>
          </div>
          <div className="garden-grid">
            {GARDEN_DATA.map((l, i) => (
              <div
                key={i}
                className={`garden-cell${BLOOMS.has(i) ? ' bloom' : (l > 0 ? ` s${l}` : '')}`}
                title={`Day ${i + 1} · ${l === 0 ? 'No study' : (BLOOMS.has(i) ? 'Bloom day!' : `Level ${l}`)}`}
              />
            ))}
          </div>
          <div className="garden-foot">
            <span>Less</span>
            <div className="garden-legend">
              <span style={{ background: 'var(--rr-bg-alt)' }}></span>
              <span style={{ background: 'color-mix(in oklab, var(--rr-emerald-500) 22%, var(--rr-bg-alt))' }}></span>
              <span style={{ background: 'color-mix(in oklab, var(--rr-emerald-500) 45%, var(--rr-bg-alt))' }}></span>
              <span style={{ background: 'color-mix(in oklab, var(--rr-emerald-500) 70%, var(--rr-bg-alt))' }}></span>
              <span style={{ background: 'var(--rr-emerald-500)' }}></span>
              <span style={{ background: 'var(--rr-lime-400)', boxShadow: '0 0 0 1px var(--rr-amber-500)' }}></span>
            </div>
            <span>More · bloom</span>
          </div>
        </div>
      </div>

      {/* Subjects + heatmap */}
      <div className="row-2" style={{ gridTemplateColumns: '1fr 1.6fr' }}>
        <div className="dcard">
          <div className="head">
            <div>
              <h3>Accuracy by subject</h3>
              <span className="sub">Last 7 days · 412 questions</span>
            </div>
          </div>
          <div className="subj-bars">
            <div className="subj-row">
              <span className="nm"><span className="d" style={{ background: 'var(--rr-violet-500)' }}></span>Maths</span>
              <div className="bar"><div className="fill" style={{ width: '94%', background: 'var(--rr-violet-500)' }}></div></div>
              <span className="acc" style={{ color: 'var(--rr-emerald-500)' }}>94%</span>
            </div>
            <div className="subj-row">
              <span className="nm"><span className="d" style={{ background: 'var(--rr-amber-500)' }}></span>Chemistry</span>
              <div className="bar"><div className="fill" style={{ width: '89%', background: 'var(--rr-amber-500)' }}></div></div>
              <span className="acc" style={{ color: 'var(--rr-emerald-500)' }}>89%</span>
            </div>
            <div className="subj-row">
              <span className="nm"><span className="d" style={{ background: 'var(--rr-cyan-500)' }}></span>Physics</span>
              <div className="bar"><div className="fill" style={{ width: '76%', background: 'var(--rr-cyan-500)' }}></div></div>
              <span className="acc" style={{ color: 'var(--rr-amber-500)' }}>76%</span>
            </div>
            <div className="subj-row">
              <span className="nm"><span className="d" style={{ background: 'var(--rr-emerald-500)' }}></span>Biology</span>
              <div className="bar"><div className="fill" style={{ width: '62%', background: 'var(--rr-emerald-500)' }}></div></div>
              <span className="acc" style={{ color: 'var(--rr-coral-500)' }}>62%</span>
            </div>
          </div>
        </div>

        <div className="dcard dh-card">
          <div className="head">
            <div>
              <h3>When you study</h3>
              <span className="sub">Questions per hour · last 30 days · peak <b style={{ color: 'var(--rr-fg)' }}>6–9 PM</b></span>
            </div>
          </div>
          <div className="dh-grid">
            {heatmapRows.map(({ day, cells }) => (
              <React.Fragment key={day}>
                <div className="row-lbl">{day}</div>
                {cells.map((l, h) => (
                  <div key={h} className={`dh-cell${l > 0 ? ` l${l}` : ''}`} title={`${day} · ${h}:00 · ${l} questions`} />
                ))}
              </React.Fragment>
            ))}
          </div>
          <div className="dh-hours">
            <div className="pad"></div>
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="ix">{hourLabel(h)}</span>
            ))}
          </div>
          <div className="dh-foot">
            <span>Sleep-late peak: <b style={{ color: 'var(--rr-fg)' }}>11 PM Sat</b></span>
            <span>Productivity sweet spot: <b style={{ color: 'var(--rr-fg)' }}>Tue 7 PM</b></span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="dcard timeline-card" style={{ marginTop: 18 }}>
        <div className="timeline-head">
          <div>
            <h3>Timeline</h3>
            <span className="sub">Everything that happened on your account, newest first.</span>
          </div>
        </div>
        <div className="timeline-filters">
          {TIMELINE_FILTERS.map((f, i) => {
            const Icon = f.icon
            return (
              <button key={f.label} className={`chip${activeFilter === i ? ' on' : ''}`} onClick={() => setActiveFilter(i)}>
                {Icon && <Icon size={13} />}
                {f.label} <span className="n">{f.count}</span>
              </button>
            )
          })}
        </div>

        {/* TODAY */}
        <div className="day-sep">
          <span className="left">Today<small>Tuesday, 27 May 2026</small></span>
          <span className="right"><b>3 events</b> · <b>1 quiz</b> · <b>+14 ranks</b></span>
        </div>

        <div className="t-item rankup">
          <div className="t-rail"></div>
          <div className="t-ico"><TrendingUp size={16} /></div>
          <div className="t-body">
            <span className="t-title">Climbed <b>14 ranks</b> · now <b>#88</b></span>
            <span className="t-meta">JEE Main · Class 12 · ahead of <b>71.8%</b> of the field</span>
          </div>
          <div className="t-right"><span className="t-time">8:44 AM</span><span className="t-amt rank">+14</span></div>
        </div>

        <div className="t-item quiz">
          <div className="t-rail"></div>
          <div className="t-ico"><CircleCheck size={16} /></div>
          <div className="t-body">
            <span className="t-title">Calculus · <b>Limits &amp; continuity</b></span>
            <span className="t-meta">Standard quiz · 12 min · <b>18 / 20 correct</b> · cost 1 token</span>
          </div>
          <div className="t-right"><span className="t-time">8:42 AM</span><span className="t-score-pill good">90%</span></div>
        </div>

        <div className="t-item token">
          <div className="t-rail"></div>
          <div className="t-ico"><Coins size={16} /></div>
          <div className="t-body">
            <span className="t-title">Spent <b>1 token</b> on Calculus quiz</span>
            <span className="t-meta">Wallet: 13 → <b>12 tokens</b></span>
          </div>
          <div className="t-right"><span className="t-time">8:41 AM</span><span className="t-amt neg">−1</span></div>
        </div>

        {/* YESTERDAY */}
        <div className="day-sep">
          <span className="left">Yesterday<small>Monday, 26 May 2026</small></span>
          <span className="right"><b>5 events</b> · <b>2 quizzes</b> · <b>+22 ranks</b> · <b>+1 token</b></span>
        </div>

        <div className="t-item streak">
          <div className="t-rail"></div>
          <div className="t-ico"><Flame size={16} /></div>
          <div className="t-body">
            <span className="t-title"><b>14-day streak</b> milestone hit · earned <b>+1 token</b></span>
            <span className="t-meta">Keep going: 21 days for the next bonus</span>
          </div>
          <div className="t-right"><span className="t-time">11:24 PM</span><span className="t-amt pos">+1</span></div>
        </div>

        <div className="t-item rankup">
          <div className="t-rail"></div>
          <div className="t-ico"><TrendingUp size={16} /></div>
          <div className="t-body">
            <span className="t-title">Climbed <b>22 ranks</b> · #124 → <b>#102</b></span>
            <span className="t-meta">After JEE Main mock test 04</span>
          </div>
          <div className="t-right"><span className="t-time">7:38 PM</span><span className="t-amt rank">+22</span></div>
        </div>

        <div className="t-item quiz">
          <div className="t-rail"></div>
          <div className="t-ico"><CircleCheck size={16} /></div>
          <div className="t-body">
            <span className="t-title">JEE Main · <b>Mock test 04</b></span>
            <span className="t-meta">Full-length · 3 hours · <b>78 / 90 correct</b> · cost 3 tokens</span>
          </div>
          <div className="t-right"><span className="t-time">4:18 PM</span><span className="t-score-pill ok">87%</span></div>
        </div>

        <div className="t-item quiz">
          <div className="t-rail"></div>
          <div className="t-ico"><CircleCheck size={16} /></div>
          <div className="t-body">
            <span className="t-title">Physics · <b>Wave optics</b></span>
            <span className="t-meta">Standard quiz · 14 min · <b>16 / 18 correct</b> · cost 1 token</span>
          </div>
          <div className="t-right"><span className="t-time">11:02 AM</span><span className="t-score-pill good">89%</span></div>
        </div>

        <div className="t-item badge">
          <div className="t-rail"></div>
          <div className="t-ico"><Medal size={16} /></div>
          <div className="t-body">
            <span className="t-title">Badge unlocked · <b>Calc Slayer</b></span>
            <span className="t-meta">100 calculus questions answered at &gt;90% accuracy</span>
          </div>
          <div className="t-right"><span className="t-time">10:38 AM</span></div>
        </div>

        {/* TWO DAYS AGO */}
        <div className="day-sep">
          <span className="left">2 days ago<small>Sunday, 25 May 2026</small></span>
          <span className="right"><b>4 events</b> · <b>2 quizzes</b> · <b>+2 tokens</b></span>
        </div>

        <div className="t-item refer">
          <div className="t-rail"></div>
          <div className="t-ico"><Gift size={16} /></div>
          <div className="t-body">
            <span className="t-title"><b>Tanvi Sharma</b> upgraded to Starter via your link</span>
            <span className="t-meta">+2 tokens to you · +2 tokens to Tanvi · 2 of 5 referrals converted</span>
          </div>
          <div className="t-right"><span className="t-time">6:14 PM</span><span className="t-amt pos">+2</span></div>
        </div>

        <div className="t-item quiz">
          <div className="t-rail"></div>
          <div className="t-ico"><CircleCheck size={16} /></div>
          <div className="t-body">
            <span className="t-title">Chemistry · <b>Periodic table</b></span>
            <span className="t-meta">Standard quiz · 10 min · <b>19 / 20 correct</b> · cost 1 token</span>
          </div>
          <div className="t-right"><span className="t-time">2:24 PM</span><span className="t-score-pill good">95%</span></div>
        </div>

        <div className="t-item quiz">
          <div className="t-rail"></div>
          <div className="t-ico"><CircleCheck size={16} /></div>
          <div className="t-body">
            <span className="t-title">Maths · <b>Trigonometry identities</b></span>
            <span className="t-meta">Standard quiz · 10 min · <b>18 / 20 correct</b> · cost 1 token</span>
          </div>
          <div className="t-right"><span className="t-time">11:48 AM</span><span className="t-score-pill good">90%</span></div>
        </div>

        <div className="t-item rankup">
          <div className="t-rail"></div>
          <div className="t-ico"><TrendingUp size={16} /></div>
          <div className="t-body">
            <span className="t-title">Climbed <b>18 ranks</b> · #142 → <b>#124</b></span>
            <span className="t-meta">After Periodic table quiz</span>
          </div>
          <div className="t-right"><span className="t-time">2:26 PM</span><span className="t-amt rank">+18</span></div>
        </div>

        {/* A WEEK AGO */}
        <div className="day-sep">
          <span className="left">7 days ago<small>Tuesday, 20 May 2026</small></span>
          <span className="right"><b>2 events</b></span>
        </div>

        <div className="t-item plan">
          <div className="t-rail"></div>
          <div className="t-ico"><UserPlus size={16} /></div>
          <div className="t-body">
            <span className="t-title">Account created</span>
            <span className="t-meta">Welcome to RankRush · +1 free token credited</span>
          </div>
          <div className="t-right"><span className="t-time">9:14 AM</span></div>
        </div>

        <div className="t-item token">
          <div className="t-rail"></div>
          <div className="t-ico"><Coins size={16} /></div>
          <div className="t-body">
            <span className="t-title">Welcome bonus · <b>+1 token</b></span>
            <span className="t-meta">First-time signup gift · wallet: 0 → <b>1 token</b></span>
          </div>
          <div className="t-right"><span className="t-time">9:14 AM</span><span className="t-amt pos">+1</span></div>
        </div>

        <div className="tl-foot">
          <span>Showing <b style={{ color: 'var(--rr-fg)' }}>14</b> of 28 events · last 7 days</span>
          <a href="#">Load more →</a>
        </div>
      </div>

    </div>
  )
}
