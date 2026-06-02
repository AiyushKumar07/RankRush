import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CircleCheck, Target, TrendingUp, Flame, ArrowUp, ArrowDown, Download,
  Coins, Gift, Medal, UserPlus, Crown, RefreshCw, ShoppingBag,
  CircleDot, CircleSlash, Pencil, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { activityAPI } from '../../services/api'
import './ActivityPage.css'

// Period tab → query-param mapping. Keeps the UI labels stable while the
// backend speaks the canonical "today | 7d | 30d | 90d | all".
const PERIODS = [
  { label: 'Today',    key: 'today' },
  { label: '7 days',   key: '7d'    },
  { label: '30 days',  key: '30d'   },
  { label: '90 days',  key: '90d'   },
  { label: 'All time', key: 'all'   },
]

const CATEGORY_TABS = [
  { label: 'All',      key: 'ALL',    icon: null         },
  { label: 'Quizzes',  key: 'QUIZ',   icon: CircleCheck  },
  { label: 'Rank-ups', key: 'RANK',   icon: TrendingUp   },
  { label: 'Tokens',   key: 'TOKEN',  icon: Coins        },
  { label: 'Badges',   key: 'BADGE',  icon: Medal        },
  { label: 'Streak',   key: 'STREAK', icon: Flame        },
  { label: 'Plan',     key: 'PLAN',   icon: Crown        },
  { label: 'Social',   key: 'SOCIAL', icon: Gift         },
]

// Maps backend event type → JSX icon + extra row className for the
// timeline. Keeps the projector-emitted icon names decoupled from the
// frontend's lucide set.
const TYPE_RENDER = {
  QUIZ_COMPLETED:     { Icon: CircleCheck, rowClass: 'quiz'   },
  QUIZ_STARTED:       { Icon: CircleDot,   rowClass: 'quiz'   },
  QUIZ_ABANDONED:     { Icon: CircleSlash, rowClass: 'quiz'   },
  RANK_CHANGED:       { Icon: TrendingUp,  rowClass: 'rankup' },
  TOKEN_CREDITED:     { Icon: Coins,       rowClass: 'token'  },
  TOKEN_DEBITED:      { Icon: Coins,       rowClass: 'token'  },
  TOKEN_PURCHASED:    { Icon: ShoppingBag, rowClass: 'token'  },
  BADGE_UNLOCKED:     { Icon: Medal,       rowClass: 'badge'  },
  STREAK_DAY:         { Icon: Flame,       rowClass: 'streak' },
  STREAK_MILESTONE:   { Icon: Flame,       rowClass: 'streak' },
  STREAK_BROKEN:      { Icon: Flame,       rowClass: 'streak' },
  PLAN_PURCHASED:     { Icon: Crown,       rowClass: 'plan'   },
  PLAN_CANCELLED:     { Icon: CircleSlash, rowClass: 'plan'   },
  PLAN_REFRESHED:     { Icon: RefreshCw,   rowClass: 'plan'   },
  REFERRAL_CONVERTED: { Icon: Gift,        rowClass: 'refer'  },
  PROFILE_UPDATED:    { Icon: Pencil,      rowClass: 'plan'   },
  ACCOUNT_CREATED:    { Icon: UserPlus,    rowClass: 'plan'   },
}

function unwrap(res) { return res?.data ?? res ?? null }

function formatDayHeading(date) {
  const today = new Date(); today.setHours(0,0,0,0)
  const d = new Date(date); d.setHours(0,0,0,0)
  const diffDays = Math.round((today - d) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays > 1 && diffDays < 14) return `${diffDays} days ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDaySubheading(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

// Group feed items by UTC-ish day so we can render <day-sep> bands.
function groupByDay(items) {
  const groups = new Map()
  for (const it of items) {
    const dayKey = new Date(it.occurredAt).toDateString()
    if (!groups.has(dayKey)) groups.set(dayKey, { date: it.occurredAt, items: [] })
    groups.get(dayKey).items.push(it)
  }
  return [...groups.values()]
}

export default function ActivityPage() {
  const [periodIdx, setPeriodIdx] = useState(1)  // default "7 days"
  const [categoryIdx, setCategoryIdx] = useState(0)

  const [stats, setStats] = useState(null)
  const [counts, setCounts] = useState({})
  const [rankHistory, setRankHistory] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [heatmap, setHeatmap] = useState({ cells: [] })
  const [feedItems, setFeedItems] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [exporting, setExporting] = useState(false)

  const period = PERIODS[periodIdx].key
  const category = CATEGORY_TABS[categoryIdx].key

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const cat = category === 'ALL' ? undefined : category
      const [statsRes, countsRes, rankRes, subjRes, hmRes, feedRes] = await Promise.all([
        activityAPI.getStats({ period }).then(unwrap),
        activityAPI.getCounts({ period }).then(unwrap),
        activityAPI.getRankHistory({ period }).then(unwrap),
        activityAPI.getSubjectAccuracy({ period }).then(unwrap),
        activityAPI.getHeatmap({ days: 364 }).then(unwrap),
        activityAPI.getFeed({ period, category: cat, limit: 30 }).then(unwrap),
      ])

      setStats(statsRes)
      setCounts(countsRes || {})
      setRankHistory(rankRes)
      setSubjects(subjRes?.subjects || [])
      setHeatmap(hmRes || { cells: [] })
      setFeedItems(feedRes?.items || [])
      setNextCursor(feedRes?.nextCursor || null)
    } catch (err) {
      toast.error(err?.message || 'Failed to load activity')
    } finally {
      setLoading(false)
    }
  }, [period, category])

  useEffect(() => { loadAll() }, [loadAll])

  const loadMore = async () => {
    if (!nextCursor) return
    setLoadingMore(true)
    try {
      const cat = category === 'ALL' ? undefined : category
      const more = await activityAPI.getFeed({
        period, category: cat, limit: 30, cursor: nextCursor,
      }).then(unwrap)
      setFeedItems((prev) => [...prev, ...(more?.items || [])])
      setNextCursor(more?.nextCursor || null)
    } catch (err) {
      toast.error(err?.message || 'Failed to load more')
    } finally {
      setLoadingMore(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = { period }
      if (category !== 'ALL') params.category = category
      const token = localStorage.getItem('rankrush_access_token')
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || '/api'}${activityAPI.exportCsvUrl(params)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rankrush-activity-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err?.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const grouped = useMemo(() => groupByDay(feedItems), [feedItems])

  const totalCount = counts.ALL ?? 0

  return (
    <div className="main">
      <div className="page-head">
        <div className="crumb">/ Activity</div>
        <h1>Activity</h1>
        <p className="sub">Every quiz, every climb, every token. The receipt of your study habit.</p>
      </div>

      <div className="period-row">
        <div className="period-tabs">
          {PERIODS.map((t, i) => (
            <button
              key={t.key}
              className={periodIdx === i ? 'on' : ''}
              onClick={() => setPeriodIdx(i)}
            >{t.label}</button>
          ))}
        </div>
        <button className="export-btn" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
          Export CSV
        </button>
      </div>

      <StatStrip stats={stats} loading={loading} />

      {/* Rank history + Streak garden */}
      <div className="row-2">
        <RankHistoryCard rankHistory={rankHistory} loading={loading} />
        <StreakGardenCard heatmap={heatmap} loading={loading} />
      </div>

      {/* Subjects — When-you-study is hidden per product call. */}
      <div className="row-2" style={{ gridTemplateColumns: '1fr' }}>
        <SubjectAccuracyCard subjects={subjects} loading={loading} period={PERIODS[periodIdx].label} />
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
          {CATEGORY_TABS.map((f, i) => {
            const Icon = f.icon
            const count = f.key === 'ALL' ? totalCount : (counts[f.key] ?? 0)
            return (
              <button
                key={f.key}
                className={`chip${categoryIdx === i ? ' on' : ''}`}
                onClick={() => setCategoryIdx(i)}
              >
                {Icon && <Icon size={13} />}
                {f.label} <span className="n">{count}</span>
              </button>
            )
          })}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--rr-fg-muted)' }}>
            <Loader2 size={20} className="spin" /> Loading timeline…
          </div>
        ) : grouped.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--rr-fg-muted)' }}>
            No activity yet for this period.
          </div>
        ) : (
          <>
            {grouped.map((group) => (
              <DayGroup key={group.date} group={group} />
            ))}
            <div className="tl-foot">
              <span>
                Showing <b style={{ color: 'var(--rr-fg)' }}>{feedItems.length}</b>
                {totalCount > feedItems.length && <> of {totalCount}</>} events
              </span>
              {nextCursor && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  style={{
                    background: 'transparent', border: 0,
                    color: 'var(--rr-violet-500)', cursor: 'pointer', fontSize: 13,
                  }}
                >
                  {loadingMore ? 'Loading…' : 'Load more →'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function StatStrip({ stats, loading }) {
  const fmtDelta = (n) => (n == null ? null : (n > 0 ? `+${n}` : String(n)))
  const fmtDeltaPts = (n) => (n == null ? null : (n > 0 ? `+${n} pts` : `${n} pts`))

  return (
    <div className="stat-strip">
      <div className="cell">
        <div className="lbl"><CircleCheck size={12} />Quizzes taken</div>
        <div className="v violet">{loading ? '—' : (stats?.quizzesTaken ?? 0)}</div>
        {stats?.quizzesDelta != null && (
          <span className="delta">
            {stats.quizzesDelta >= 0
              ? <ArrowUp size={12} />
              : <ArrowDown size={12} />}
            {fmtDelta(stats.quizzesDelta)} vs prev
          </span>
        )}
      </div>
      <div className="cell">
        <div className="lbl"><Target size={12} />Avg. accuracy</div>
        <div className="v emerald">
          {loading ? '—' : (stats?.avgAccuracy ?? 0)}<small>%</small>
        </div>
        {stats?.accuracyDelta != null && (
          <span className="delta">
            {stats.accuracyDelta >= 0
              ? <ArrowUp size={12} />
              : <ArrowDown size={12} />}
            {fmtDeltaPts(stats.accuracyDelta)}
          </span>
        )}
      </div>
      <div className="cell">
        <div className="lbl"><TrendingUp size={12} />Rank movement</div>
        <div className="v cyan">
          {loading
            ? '—'
            : stats?.rankDelta == null
              ? '–'
              : (stats.rankDelta < 0 ? `+${Math.abs(stats.rankDelta)}` : `−${stats.rankDelta}`)}
        </div>
        {stats?.rankStart != null && stats?.rankEnd != null && (
          <span className="delta">
            <ArrowUp size={12} />#{stats.rankStart} → #{stats.rankEnd}
          </span>
        )}
      </div>
      <div className="cell">
        <div className="lbl"><Flame size={12} />Streak days</div>
        <div className="v amber">{loading ? '—' : (stats?.streakDays ?? 0)}</div>
        {stats?.tokensEarned != null && (
          <span className="delta">+{stats.tokensEarned} tokens earned</span>
        )}
      </div>
    </div>
  )
}

function RankHistoryCard({ rankHistory, loading }) {
  // Convert rank points to an inverted-y SVG path: rank 1 sits at the top
  // (y=10), worst rank in the dataset at the bottom (y=190). Empty
  // dataset shows a neutral "not enough history yet" message.
  const { pts, minRank, maxRank, current, scope } = useMemo(() => {
    const points = rankHistory?.points || []
    if (points.length === 0) {
      return { pts: [], minRank: null, maxRank: null, current: rankHistory?.current, scope: rankHistory?.scope }
    }
    const ranks = points.map((p) => p.rank)
    const min = Math.min(...ranks)
    const max = Math.max(...ranks)
    const range = Math.max(1, max - min)
    const w = 700, h = 200, pad = 10
    const xStep = points.length > 1 ? (w / (points.length - 1)) : w
    const pts = points.map((p, i) => {
      const x = i * xStep
      const yNorm = (p.rank - min) / range
      const y = pad + yNorm * (h - 2 * pad)
      return { x, y, rank: p.rank, at: p.at }
    })
    return { pts, minRank: min, maxRank: max, current: rankHistory?.current, scope: rankHistory?.scope }
  }, [rankHistory])

  const pathLine = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const pathArea = pts.length
    ? `${pathLine} L ${pts[pts.length - 1].x} 200 L 0 200 Z`
    : ''

  return (
    <div className="dcard">
      <div className="head">
        <div>
          <h3>Rank history</h3>
          <span className="sub">
            {scope?.displayName ?? 'Class cohort'}
            {pts.length > 1 && ` · #${pts[0].rank} → #${pts[pts.length - 1].rank}`}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--rr-font-mono)', fontSize: 10, color: 'var(--rr-violet-500)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>
          ↑ better rank
        </span>
      </div>
      <div className="rank-chart">
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--rr-fg-muted)' }}>Loading…</div>
        ) : pts.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--rr-fg-muted)', fontSize: 13 }}>
            Not enough rank history yet. Complete a few rank-rewarding quizzes to get on the board.
          </div>
        ) : (
          <>
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
              <path className="area" d={pathArea} />
              <path className="line" d={pathLine} />
              {pts.map((p, i) => (
                <circle
                  key={i}
                  className={i === pts.length - 1 ? 'pt now' : 'pt'}
                  cx={p.x}
                  cy={p.y}
                  r={i === pts.length - 1 ? 6 : 4}
                />
              ))}
            </svg>
            {current?.rank != null && <span className="lbl-now">#{current.rank} ★</span>}
          </>
        )}
      </div>
      {pts.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--rr-font-mono)', fontSize: 10, color: 'var(--rr-fg-dim)', padding: '0 4px' }}>
          <span>
            {new Date(pts[0].at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
            <br />
            <b style={{ fontFamily: 'var(--rr-font-display)', fontWeight: 700, fontSize: 11, color: 'var(--rr-fg-2)' }}>
              #{pts[0].rank}
            </b>
          </span>
          <span>
            Today
            <br />
            <b style={{ fontFamily: 'var(--rr-font-display)', fontWeight: 700, fontSize: 11, color: 'var(--rr-lime-500)' }}>
              #{pts[pts.length - 1].rank}
            </b>
          </span>
        </div>
      )}
    </div>
  )
}

function StreakGardenCard({ heatmap, loading }) {
  // Render the last ~78 cells (visually matches the previous static grid).
  const cells = (heatmap?.cells || []).slice(-78)
  return (
    <div className="dcard garden-card">
      <div className="head">
        <div>
          <h3>Streak garden</h3>
          <span className="sub">{cells.filter(c => c.count > 0).length} active days in this view</span>
        </div>
      </div>
      <div className="garden-grid">
        {loading ? (
          <div style={{ padding: 30, color: 'var(--rr-fg-muted)' }}>Loading…</div>
        ) : (
          cells.map((c, i) => (
            <div
              key={i}
              className={`garden-cell${c.level > 0 ? ` s${c.level}` : ''}`}
              title={`${c.date} · ${c.count} attempt${c.count === 1 ? '' : 's'}`}
            />
          ))
        )}
      </div>
      <div className="garden-foot">
        <span>Less</span>
        <div className="garden-legend">
          <span style={{ background: 'var(--rr-bg-alt)' }}></span>
          <span style={{ background: 'color-mix(in oklab, var(--rr-emerald-500) 22%, var(--rr-bg-alt))' }}></span>
          <span style={{ background: 'color-mix(in oklab, var(--rr-emerald-500) 45%, var(--rr-bg-alt))' }}></span>
          <span style={{ background: 'color-mix(in oklab, var(--rr-emerald-500) 70%, var(--rr-bg-alt))' }}></span>
          <span style={{ background: 'var(--rr-emerald-500)' }}></span>
        </div>
        <span>More</span>
      </div>
    </div>
  )
}

const SUBJECT_COLORS = {
  Mathematics: 'var(--rr-violet-500)',
  Maths:       'var(--rr-violet-500)',
  Chemistry:   'var(--rr-amber-500)',
  Physics:     'var(--rr-cyan-500)',
  Biology:     'var(--rr-emerald-500)',
}
function colorForSubject(name) {
  return SUBJECT_COLORS[name] || 'var(--rr-fg-muted)'
}
function accuracyTone(pct) {
  if (pct >= 85) return 'var(--rr-emerald-500)'
  if (pct >= 70) return 'var(--rr-amber-500)'
  return 'var(--rr-coral-500)'
}

function SubjectAccuracyCard({ subjects, loading, period }) {
  const totalQ = subjects.reduce((s, x) => s + (x.questions || 0), 0)
  return (
    <div className="dcard">
      <div className="head">
        <div>
          <h3>Accuracy by subject</h3>
          <span className="sub">{period} · {totalQ} questions</span>
        </div>
      </div>
      <div className="subj-bars">
        {loading ? (
          <div style={{ padding: 30, color: 'var(--rr-fg-muted)' }}>Loading…</div>
        ) : subjects.length === 0 ? (
          <div style={{ padding: 30, color: 'var(--rr-fg-muted)', fontSize: 13 }}>
            No completed quizzes for this period yet.
          </div>
        ) : subjects.map((s) => (
          <div key={s.subject} className="subj-row">
            <span className="nm">
              <span className="d" style={{ background: colorForSubject(s.subject) }}></span>
              {s.subject}
            </span>
            <div className="bar">
              <div
                className="fill"
                style={{ width: `${s.accuracy}%`, background: colorForSubject(s.subject) }}
              ></div>
            </div>
            <span className="acc" style={{ color: accuracyTone(s.accuracy) }}>{s.accuracy}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DayGroup({ group }) {
  const heading = formatDayHeading(group.date)
  const sub = formatDaySubheading(group.date)
  const quizCount = group.items.filter(i => i.type === 'QUIZ_COMPLETED').length
  const rankDelta = group.items
    .filter(i => i.type === 'RANK_CHANGED')
    .reduce((s, i) => s + (i.amount || 0), 0)
  const tokenDelta = group.items
    .filter(i => i.category === 'TOKEN' || i.type === 'STREAK_MILESTONE')
    .reduce((s, i) => s + (i.amount || 0), 0)

  return (
    <>
      <div className="day-sep">
        <span className="left">{heading}<small>{sub}</small></span>
        <span className="right">
          <b>{group.items.length} event{group.items.length === 1 ? '' : 's'}</b>
          {quizCount > 0 && <> · <b>{quizCount} quiz{quizCount === 1 ? '' : 'zes'}</b></>}
          {rankDelta !== 0 && <> · <b>{rankDelta > 0 ? `+${rankDelta}` : rankDelta} ranks</b></>}
          {tokenDelta !== 0 && <> · <b>{tokenDelta > 0 ? `+${tokenDelta}` : tokenDelta} tokens</b></>}
        </span>
      </div>
      {group.items.map((it) => <TimelineRow key={it.id} item={it} />)}
    </>
  )
}

function TimelineRow({ item }) {
  const meta = TYPE_RENDER[item.type] || { Icon: CircleDot, rowClass: 'plan' }
  const Icon = meta.Icon
  const amount = item.amount

  // Right-side chip: amount or score pill depending on category.
  let right = null
  if (item.category === 'QUIZ' && item.type === 'QUIZ_COMPLETED' && amount != null) {
    const tone = amount >= 80 ? 'good' : amount >= 50 ? 'ok' : 'bad'
    right = <span className={`t-score-pill ${tone}`}>{Math.round(amount)}%</span>
  } else if (item.category === 'TOKEN' && amount != null) {
    right = <span className={`t-amt ${amount >= 0 ? 'pos' : 'neg'}`}>
      {amount >= 0 ? `+${amount}` : amount}
    </span>
  } else if (item.category === 'RANK' && amount != null && amount !== 0) {
    right = <span className="t-amt rank">{amount > 0 ? `+${amount}` : amount}</span>
  } else if (item.category === 'STREAK' && amount != null && amount > 0) {
    right = <span className="t-amt pos">+{amount}</span>
  } else if (item.category === 'PLAN' && amount != null && amount !== 0) {
    right = <span className={`t-amt ${amount >= 0 ? 'pos' : 'neg'}`}>
      {amount >= 0 ? `+${amount}` : amount}
    </span>
  } else if (item.category === 'SOCIAL' && amount != null && amount > 0) {
    right = <span className="t-amt pos">+{amount}</span>
  }

  return (
    <div className={`t-item ${meta.rowClass}`}>
      <div className="t-rail"></div>
      <div className="t-ico"><Icon size={16} /></div>
      <div className="t-body">
        <span className="t-title" dangerouslySetInnerHTML={{ __html: boldifyTitle(item.title) }} />
        {item.meta && <span className="t-meta">{item.meta}</span>}
      </div>
      <div className="t-right">
        <span className="t-time">{formatTime(item.occurredAt)}</span>
        {right}
      </div>
    </div>
  )
}

// Very small allowlist-ish "bold the last segment after the dash" helper.
// The backend ships title strings like "Maths · Limits & continuity" —
// rendering them as plain text drops the visual hierarchy the old static
// page had, so we bold the bit after the last separator.
function boldifyTitle(title) {
  if (!title) return ''
  const safe = title.replace(/</g, '&lt;')
  const lastDot = safe.lastIndexOf(' · ')
  if (lastDot === -1) return safe
  const left = safe.slice(0, lastDot + 3)
  const right = safe.slice(lastDot + 3)
  return `${left}<b>${right}</b>`
}
