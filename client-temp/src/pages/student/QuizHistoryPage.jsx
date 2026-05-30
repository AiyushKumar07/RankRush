import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, ChevronLeft, Clock, CircleCheck, Trophy,
  Loader2, BarChart3, Calendar, Target, Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { studentAPI } from '../../services/api'
import './QuizHistoryPage.css'

function unwrap(res) { return res?.data ?? res ?? null }

// Same subject → colour-key mapping as QuizzesPage; kept local so the page
// stays standalone and doesn't depend on a global mapping module.
const SUBJECT_KEYS = [
  { match: /math/i,        key: 'math',    dot: 'var(--rr-violet-500)' },
  { match: /physics/i,     key: 'physics', dot: 'var(--rr-cyan-500)' },
  { match: /chem/i,        key: 'chem',    dot: 'var(--rr-amber-500)' },
  { match: /(bio|botany|zoology)/i, key: 'bio', dot: 'var(--rr-emerald-500)' },
]
function subjectKeyFor(s) {
  if (!s) return 'mixed'
  return SUBJECT_KEYS.find((k) => k.match.test(s))?.key ?? 'mixed'
}

function fmtRelative(date) {
  if (!date) return '—'
  const now = Date.now()
  const t = new Date(date).getTime()
  const diff = now - t
  const days = Math.floor(diff / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtPhase(lb) {
  if (!lb) return null
  if (lb.isClosed) return { tone: 'closed', label: 'Closed' }
  if (lb.quizStartsAt && new Date(lb.quizStartsAt).getTime() > Date.now()) {
    return { tone: 'upcoming', label: 'Upcoming' }
  }
  if (lb.quizEndsAt) {
    const ms = new Date(lb.quizEndsAt).getTime() - Date.now()
    if (ms > 0 && ms < 24 * 60 * 60 * 1000) return { tone: 'closing', label: 'Closing soon' }
  }
  return { tone: 'live', label: 'Live' }
}

export default function QuizHistoryPage() {
  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'ranked' | 'practice'

  useEffect(() => {
    setLoading(true)
    studentAPI.getQuizHistory({ page, limit: 20 })
      .then((res) => {
        setRows(unwrap(res)?.history || [])
        setPagination(res?.pagination || { page: 1, pages: 1, total: 0, limit: 20 })
      })
      .catch((err) => {
        toast.error(err?.message || 'Failed to load history')
        setRows([])
      })
      .finally(() => setLoading(false))
  }, [page])

  const filtered = useMemo(() => {
    if (filter === 'ranked') return rows.filter((r) => r.rankRewarding)
    if (filter === 'practice') return rows.filter((r) => !r.rankRewarding)
    return rows
  }, [rows, filter])

  // Aggregate strip across the *currently loaded* page — gives a quick read
  // of how the user is performing without needing a separate stats endpoint.
  const summary = useMemo(() => {
    if (rows.length === 0) return null
    const totalAttempts = rows.reduce((s, r) => s + r.attempts, 0)
    const avgBest = Math.round(rows.reduce((s, r) => s + r.bestPct, 0) / rows.length)
    const rankedCount = rows.filter((r) => r.rankRewarding).length
    const rankedWithRank = rows.filter((r) => r.rankRewarding && r.leaderboard?.myRank != null)
    const bestRank = rankedWithRank.length
      ? Math.min(...rankedWithRank.map((r) => r.leaderboard.myRank))
      : null
    return { totalAttempts, avgBest, rankedCount, bestRank }
  }, [rows])

  return (
    <div className="main">
      <div className="page-head">
        <Link to="/app/quizzes" className="qh-back" aria-label="Back to quizzes">
          <ChevronLeft size={16} />
        </Link>
        <div>
          <div className="crumb">
            <Link to="/app">Home</Link> / <Link to="/app/quizzes">Quizzes</Link> / History
          </div>
          <h1>Your quiz history</h1>
          <p className="sub">
            Every quiz you've completed, with rank context for the ranked ones. Tap any row to revisit the result or check the leaderboard.
          </p>
        </div>
      </div>

      {summary && (
        <div className="qh-stats">
          <div className="qh-stat">
            <span className="lbl"><BarChart3 size={12} /> Quizzes attempted</span>
            <strong>{pagination.total}</strong>
          </div>
          <div className="qh-stat">
            <span className="lbl"><Target size={12} /> Avg best score</span>
            <strong>{summary.avgBest}%</strong>
          </div>
          <div className="qh-stat">
            <span className="lbl"><Sparkles size={12} /> Total attempts</span>
            <strong>{summary.totalAttempts}</strong>
          </div>
          <div className="qh-stat">
            <span className="lbl"><Trophy size={12} /> Best rank</span>
            <strong>{summary.bestRank != null ? `#${summary.bestRank}` : '—'}</strong>
          </div>
        </div>
      )}

      <div className="qh-toolbar">
        <div className="qh-tabs">
          {[
            { key: 'all', label: `All · ${rows.length}` },
            { key: 'ranked', label: `Rank-rewarding · ${rows.filter((r) => r.rankRewarding).length}` },
            { key: 'practice', label: `Practice · ${rows.filter((r) => !r.rankRewarding).length}` },
          ].map((t) => (
            <button
              key={t.key}
              className={`qh-tab${filter === t.key ? ' on' : ''}`}
              onClick={() => setFilter(t.key)}
            >{t.label}</button>
          ))}
        </div>
      </div>

      <div className="qh-list">
        {loading ? (
          <div className="qh-empty"><Loader2 size={18} className="qh-spin" /> Loading history…</div>
        ) : filtered.length === 0 ? (
          <div className="qh-empty">
            <strong>No quizzes here yet.</strong>
            <p>Once you complete quizzes, they'll show up here with your best score and rank.</p>
            <Link to="/app/quizzes" className="btn btn-secondary btn-sm" style={{ marginTop: 14 }}>
              Browse quizzes <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          filtered.map((r) => <HistoryRow key={r.quizId} row={r} />)
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="pager">
          <button title="Previous" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            <ArrowLeft size={14} />
          </button>
          <span style={{ fontFamily: 'var(--rr-font-mono)', fontSize: 12, color: 'var(--rr-fg-muted)', padding: '0 10px' }}>
            Page {page} / {pagination.pages}
          </span>
          <button title="Next" onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

function HistoryRow({ row }) {
  const subjectKey = subjectKeyFor(row.subject)
  const phase = fmtPhase(row.leaderboard)
  const minutes = row.timeLimitMins || 0
  const duration = minutes >= 60 && minutes % 60 === 0
    ? `${minutes / 60}h`
    : `${minutes}m`

  return (
    <article className={`qh-row`} data-subj={subjectKey}>
      <span className="qh-band" aria-hidden />
      <div className="qh-row-body">
        <div className="qh-row-head">
          <span className="qh-subject">
            <span className="qh-dot" aria-hidden />
            {row.subject || 'Mixed'}
          </span>
          {row.chapter && <span className="qh-topic">{row.chapter}{row.topic ? ` · ${row.topic}` : ''}</span>}
          {row.rankRewarding && phase && (
            <span className={`qh-phase qh-phase-${phase.tone}`}>{phase.label}</span>
          )}
        </div>
        <h3>{row.title}</h3>
        <div className="qh-meta">
          <span><Calendar size={12} /> Last attempt {fmtRelative(row.lastAttemptAt)}</span>
          <span><Clock size={12} /> {duration}</span>
          <span><CircleCheck size={12} /> {row.totalQuestions} Qs</span>
          <span>{row.attempts} attempt{row.attempts === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="qh-scores">
        <div className="qh-score-block">
          <span className="lbl">Best</span>
          <strong className="qh-best">{row.bestPct}%</strong>
        </div>
        <div className="qh-score-block">
          <span className="lbl">Last</span>
          <strong>{row.lastPct}%</strong>
        </div>
        {row.rankRewarding && (
          <div className="qh-score-block">
            <span className="lbl"><Trophy size={11} /> Rank</span>
            <strong className={row.leaderboard?.myRank ? 'qh-rank' : 'qh-rank-empty'}>
              {row.leaderboard?.myRank != null
                ? <>#{row.leaderboard.myRank}<span className="qh-rank-of"> / {row.leaderboard.totalParticipants}</span></>
                : '—'}
            </strong>
          </div>
        )}
      </div>

      <div className="qh-actions">
        <Link to={`/app/quizzes/${row.quizId}/result`} className="btn btn-secondary btn-sm">
          Review <ArrowRight size={14} />
        </Link>
        {row.rankRewarding && (
          <Link to={`/app/leaderboards`} className="btn btn-ghost btn-sm" title="Open leaderboard">
            <Trophy size={14} /> Leaderboard
          </Link>
        )}
      </div>
    </article>
  )
}
