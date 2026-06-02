import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Trophy, TrendingUp, TrendingDown, Minus,
  GraduationCap, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { leaderboardsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import './LeaderboardsPage.css'

const KIND_ICON = {
  CLASS_GLOBAL: GraduationCap,
  QUIZ:         Trophy,
}
const KIND_GROUP_LABEL = {
  CLASS_GLOBAL: 'Class cohort',
  QUIZ:         'Recent ranked quizzes',
}

const PHASE_TONE = {
  UPCOMING: 'upcoming',
  LIVE:     'live',
  CLOSING:  'closing',
  CLOSED:   'closed',
}
const PHASE_LABEL = {
  UPCOMING: 'Upcoming',
  LIVE:     'Live',
  CLOSING:  'Closing',
  CLOSED:   'Closed',
}

function unwrap(res) { return res?.data ?? res ?? null }

const QUIZZES_PER_PAGE = 10

export default function LeaderboardsPage() {
  const [scopes, setScopes] = useState([])
  const [selected, setSelected] = useState(null)        // { kind, key, displayName }
  const [view, setView] = useState('top')               // 'top' | 'me'
  const [board, setBoard] = useState(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingBoard, setLoadingBoard] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [hasAutoSelected, setHasAutoSelected] = useState(false)

  useEffect(() => {
    setLoadingList(true)
    leaderboardsAPI.listForUser({ page, limit: QUIZZES_PER_PAGE })
      .then((res) => {
        const data = unwrap(res)
        const list = data?.scopes || []
        setScopes(list)
        setPagination(data?.pagination || null)
        // Default to the class-cohort scope if present, otherwise first
        // scope the user belongs to — but only the first time we load,
        // not when paging through quizzes.
        if (!hasAutoSelected) {
          const cg = list.find((s) => s.kind === 'CLASS_GLOBAL')
          setSelected(cg || list[0] || null)
          setHasAutoSelected(true)
        }
      })
      .catch((err) => toast.error(err?.message || 'Failed to load leaderboards'))
      .finally(() => setLoadingList(false))
  }, [page, hasAutoSelected])

  const loadBoard = useCallback(async (scope, mode) => {
    if (!scope) { setBoard(null); return }
    setLoadingBoard(true)
    try {
      const res = await leaderboardsAPI.getScope(
        scope.kind, scope.key,
        mode === 'me' ? { view: 'me', window: 5 } : { view: 'top', limit: 50 },
      )
      setBoard(unwrap(res))
    } catch (err) {
      toast.error(err?.message || 'Failed to load leaderboard')
      setBoard(null)
    } finally {
      setLoadingBoard(false)
    }
  }, [])

  useEffect(() => { loadBoard(selected, view) }, [selected, view, loadBoard])

  // Group scopes by kind for the left rail.
  const grouped = useMemo(() => {
    const map = new Map()
    for (const s of scopes) {
      if (!map.has(s.kind)) map.set(s.kind, [])
      map.get(s.kind).push(s)
    }
    return [...map.entries()]
  }, [scopes])

  return (
    <div className="main">
      <div className="page-head">
        <div className="crumb">/ Leaderboards</div>
        <h1>Leaderboards</h1>
        <p className="sub">Where you stand. Within your class, your exam track, your subject, and every rank-rewarding quiz you've taken.</p>
      </div>

      <div className="lb-layout">
        {/* LEFT RAIL — scope list */}
        <aside className="lb-rail">
          {loadingList ? (
            <div className="lb-empty"><Loader2 size={18} className="lb-spin" /> Loading boards…</div>
          ) : scopes.length === 0 ? (
            <div className="lb-empty">
              <p>You haven't appeared on any leaderboard yet.</p>
              <p style={{ marginTop: 8, fontSize: 12 }}>Complete a few rank-rewarding quizzes to get ranked in your class cohort.</p>
            </div>
          ) : (
            grouped.map(([kind, items]) => (
              <div key={kind} className="lb-group">
                <span className="lb-group-label">
                  {KIND_GROUP_LABEL[kind] ?? kind}
                  {kind === 'QUIZ' && pagination?.totalQuizScopes ? (
                    <span className="lb-group-count">{pagination.totalQuizScopes} total</span>
                  ) : null}
                </span>
                {items.map((s) => {
                  const Icon = KIND_ICON[s.kind] ?? Trophy
                  const isActive = selected?.kind === s.kind && selected?.key === s.key
                  return (
                    <button
                      key={`${s.kind}:${s.key}`}
                      className={`lb-scope${isActive ? ' active' : ''}`}
                      onClick={() => setSelected(s)}
                    >
                      <span className="lb-scope-icon"><Icon size={15} /></span>
                      <span className="lb-scope-body">
                        <span className="lb-scope-name">
                          {s.displayName}
                          {s.kind === 'QUIZ' && s.phase && (
                            <span className={`lb-phase lb-phase-${PHASE_TONE[s.phase]}`}>
                              {PHASE_LABEL[s.phase]}
                            </span>
                          )}
                        </span>
                        <span className="lb-scope-meta">
                          {s.me?.rank
                            ? <>You're <b>#{s.me.rank}</b> · {s.totalParticipants} ranked</>
                            : <>Not yet ranked · {s.totalParticipants} on board</>}
                          {s.kind === 'QUIZ' && s.lastAttemptPct != null && (
                            <> · last attempt <b>{s.lastAttemptPct}%</b></>
                          )}
                        </span>
                      </span>
                    </button>
                  )
                })}
                {kind === 'QUIZ' && pagination && pagination.totalPages > 1 && (
                  <div className="lb-pager">
                    <button
                      type="button"
                      className="lb-pager-btn"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1 || loadingList}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="lb-pager-info">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      type="button"
                      className="lb-pager-btn"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!pagination.hasMore || loadingList}
                      aria-label="Next page"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </aside>

        {/* RIGHT — the active board */}
        <section className="lb-board">
          {selected && (
            <header className="lb-board-head">
              <button className="lb-back" onClick={() => setSelected(null)} aria-label="Back to list">
                <ChevronLeft size={16} />
              </button>
              <div>
                <h2>{selected.displayName}</h2>
                <span className="lb-board-meta">
                  {board?.scope?.lastComputedAt
                    ? `Updated ${new Date(board.scope.lastComputedAt).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })}`
                    : ' '}
                </span>
              </div>
              <div className="lb-view-toggle">
                <button className={view === 'top' ? 'on' : ''} onClick={() => setView('top')}>Top 50</button>
                <button className={view === 'me' ? 'on' : ''} onClick={() => setView('me')}>Around me</button>
              </div>
            </header>
          )}

          {!selected ? (
            <div className="lb-empty-board">Pick a leaderboard from the left.</div>
          ) : loadingBoard ? (
            <div className="lb-empty-board"><Loader2 size={20} className="lb-spin" /> Loading…</div>
          ) : !board?.rows?.length ? (
            <div className="lb-empty-board">No ranked players in this board yet.</div>
          ) : (
            <BoardTable board={board} />
          )}
        </section>
      </div>
    </div>
  )
}

function BoardTable({ board }) {
  const { user } = useAuth()
  const meId = user?.id

  return (
    <table className="lb-table">
      <thead>
        <tr>
          <th style={{ width: 60 }}>#</th>
          <th>Player</th>
          <th style={{ width: 80 }}>Class</th>
          <th style={{ width: 90, textAlign: 'right' }}>Score</th>
          <th style={{ width: 80, textAlign: 'right' }}>Δ</th>
        </tr>
      </thead>
      <tbody>
        {board.rows.map((r) => {
          const isMe = r.isMe === true || r.user?.id === meId
          return (
            <tr key={r.user.id} className={isMe ? 'me' : ''}>
              <td className="lb-rank">
                <span className={`lb-rank-pill ${r.rank <= 3 ? `top top-${r.rank}` : ''}`}>
                  #{r.rank}
                </span>
              </td>
              <td>
                <div className="lb-user">
                  <div className="lb-avatar">{r.user.initials}</div>
                  <div className="lb-user-meta">
                    <span className="lb-user-name">{r.user.displayName}{isMe && <span className="lb-you">YOU</span>}</span>
                    {r.user.username && <span className="lb-user-handle">@{r.user.username}</span>}
                  </div>
                </div>
              </td>
              <td className="lb-class">{r.user.class || '—'}</td>
              <td className="lb-score">{r.score.toLocaleString('en-IN')}</td>
              <td className="lb-delta">
                <DeltaCell delta={r.delta} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function DeltaCell({ delta }) {
  if (delta == null) return <span className="lb-delta-flat">—</span>
  if (delta === 0) return <span className="lb-delta-flat"><Minus size={12} /> 0</span>
  // Positive delta = climbed up (better rank now).
  return delta > 0
    ? <span className="lb-delta-up"><TrendingUp size={12} /> +{delta}</span>
    : <span className="lb-delta-down"><TrendingDown size={12} /> {delta}</span>
}
