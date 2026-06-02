import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft, Loader2, Trophy, Lock, CircleCheck,
  Sparkles, Crown, Flame, BookOpen, Library, Award, Rocket,
  Target, Medal, TrendingUp, Zap, Coins, Sigma, Atom,
  FlaskConical, Leaf,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { badgesAPI } from '../../services/api'
import './BadgesPage.css'

function unwrap(res) { return res?.data ?? res ?? null }

// Same name → lucide-component map as DashboardPage's achievement card.
const BADGE_ICONS = {
  Sparkles, CircleCheck, Crown, Flame, BookOpen, Library, Award, Rocket,
  Target, Trophy, Medal, TrendingUp, Zap, Coins, Sigma, Atom, FlaskConical, Leaf,
}

const CATEGORY_LABEL = {
  milestone: 'Milestones',
  volume:    'Volume',
  streak:    'Streaks',
  accuracy:  'Accuracy',
  rank:      'Rank',
  mastery:   'Subject mastery',
}

const TIER_ORDER = { bronze: 0, silver: 1, gold: 2, platinum: 3 }

function fmtNum(n) {
  if (n == null) return '—'
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(Math.round(n))
}

export default function BadgesPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'unlocked' | 'locked'

  useEffect(() => {
    setLoading(true)
    badgesAPI.list()
      .then((res) => setData(unwrap(res) ?? null))
      .catch((err) => {
        toast.error(err?.message || 'Failed to load badges')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const items = data?.items ?? []
  const summary = data?.summary

  const filtered = useMemo(() => {
    if (filter === 'unlocked') return items.filter((b) => b.unlocked)
    if (filter === 'locked')   return items.filter((b) => !b.unlocked)
    return items
  }, [items, filter])

  // Group by category, then sort within each group by unlocked-first
  // and tier ascending so the page reads as a progression.
  const groups = useMemo(() => {
    const map = new Map()
    for (const b of filtered) {
      const key = b.category || 'milestone'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(b)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1
        const tA = TIER_ORDER[a.tier] ?? 0
        const tB = TIER_ORDER[b.tier] ?? 0
        if (tA !== tB) return tA - tB
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      })
    }
    return [...map.entries()]
  }, [filtered])

  return (
    <div className="main">
      <div className="page-head">
        <Link to="/app" className="bg-back" aria-label="Back to dashboard">
          <ChevronLeft size={16} />
        </Link>
        <div>
          <div className="crumb">
            <Link to="/app">Home</Link> / Achievements
          </div>
          <h1>Achievements</h1>
          <p className="sub">
            Badges you've earned + everything still up for grabs. Rules
            evaluate every time you load the page, so progress reflects your
            real activity.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-empty"><Loader2 size={18} className="bg-spin" /> Loading badges…</div>
      ) : items.length === 0 ? (
        <div className="bg-empty">
          <strong>No badges yet.</strong>
          <p>Once badges are configured by an admin they'll show up here.</p>
        </div>
      ) : (
        <>
          <div className="bg-summary">
            <div className="bg-stat">
              <span className="lbl"><Trophy size={12} /> Unlocked</span>
              <strong>{summary?.unlocked ?? 0}</strong>
              <span className="hint">of {summary?.total ?? 0}</span>
            </div>
            <div className="bg-stat">
              <span className="lbl"><Lock size={12} /> Locked</span>
              <strong>{(summary?.total ?? 0) - (summary?.unlocked ?? 0)}</strong>
              <span className="hint">still to unlock</span>
            </div>
            <div className="bg-stat">
              <span className="lbl"><Sparkles size={12} /> Closest</span>
              <strong>
                {(() => {
                  const closest = items
                    .filter((b) => !b.unlocked)
                    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))[0]
                  return closest ? `${Math.round((closest.progress ?? 0) * 100)}%` : '—'
                })()}
              </strong>
              <span className="hint">
                {(() => {
                  const closest = items
                    .filter((b) => !b.unlocked)
                    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))[0]
                  return closest ? closest.name : 'All earned!'
                })()}
              </span>
            </div>
          </div>

          <div className="bg-toolbar">
            <div className="bg-tabs">
              {[
                { key: 'all',      label: `All · ${items.length}` },
                { key: 'unlocked', label: `Unlocked · ${items.filter((b) => b.unlocked).length}` },
                { key: 'locked',   label: `Locked · ${items.filter((b) => !b.unlocked).length}` },
              ].map((t) => (
                <button
                  key={t.key}
                  className={`bg-tab${filter === t.key ? ' on' : ''}`}
                  onClick={() => setFilter(t.key)}
                >{t.label}</button>
              ))}
            </div>
          </div>

          {groups.map(([cat, list]) => (
            <section key={cat} className="bg-section">
              <h2>{CATEGORY_LABEL[cat] ?? cat}</h2>
              <div className="bg-grid">
                {list.map((b) => {
                  const Icon = BADGE_ICONS[b.icon] ?? Medal
                  return (
                    <article
                      key={b.id}
                      className={`bg-card ${b.unlocked ? `tone-${b.tone || 'violet'}` : 'locked'} tier-${b.tier || 'bronze'}`}
                    >
                      <div className="bg-card-ring">
                        <Icon size={26} />
                        {!b.unlocked && (
                          <span className="bg-card-lock" aria-hidden><Lock size={12} /></span>
                        )}
                      </div>
                      <h3 className="bg-card-name">{b.name}</h3>
                      <p className="bg-card-desc">{b.description}</p>
                      {b.unlocked ? (
                        <div className="bg-card-status earned">
                          <CircleCheck size={12} /> Earned
                          {b.unlockedAt && (
                            <span className="bg-card-when">
                              {new Date(b.unlockedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="bg-card-bar">
                            <div
                              className="bg-card-bar-fill"
                              style={{ width: `${Math.max(2, Math.round((b.progress ?? 0) * 100))}%` }}
                            />
                          </div>
                          <div className="bg-card-status locked">
                            <span>{fmtNum(b.current)} / {fmtNum(b.target)}</span>
                            <span className="bg-card-pct">{Math.round((b.progress ?? 0) * 100)}%</span>
                          </div>
                        </>
                      )}
                      {b.reward?.tokens > 0 && (
                        <span className="bg-card-reward" title="Reward on unlock">
                          <Coins size={11} /> {b.reward.tokens}
                        </span>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
