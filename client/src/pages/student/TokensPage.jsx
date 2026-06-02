import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Coins, Flame, Gift, CircleMinus, RefreshCw, ArrowUp,
  ShoppingBag, Sparkles, Loader2,
} from 'lucide-react'
import { tokensAPI, subscriptionPlansAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useEntitlements } from '../../hooks/useEntitlements'
import './TokensPage.css'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'earned', label: 'Earned' },
  { key: 'spent', label: 'Spent' },
]

const TXN_META = {
  PURCHASE:             { label: 'Purchase',  icon: ShoppingBag, kind: 'earned', tone: 'earned' },
  SUBSCRIPTION_REFRESH: { label: 'Refresh',   icon: RefreshCw,   kind: 'reset',  tone: 'reset' },
  REFERRAL_BONUS:       { label: 'Referral',  icon: Gift,        kind: 'earned', tone: 'earned' },
  ADMIN_CREDIT:         { label: 'Bonus',     icon: Sparkles,    kind: 'earned', tone: 'bonus' },
  REFUND:               { label: 'Refund',    icon: RefreshCw,   kind: 'earned', tone: 'earned' },
  QUIZ_CONSUMED:        { label: 'Spent',     icon: CircleMinus, kind: 'spent',  tone: 'spent' },
}

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const yest = new Date(today); yest.setDate(today.getDate() - 1)
  const isYesterday = d.toDateString() === yest.toDateString()
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  if (sameDay) return `Today · ${time}`
  if (isYesterday) return `Yesterday · ${time}`
  const days = Math.floor((today - d) / (1000 * 60 * 60 * 24))
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export default function TokensPage() {
  const { user } = useAuth()
  const { planName } = useEntitlements()

  const [wallet, setWallet] = useState({ balance: 0, transactions: [] })
  const [subscription, setSubscription] = useState(null)
  const [referrals, setReferrals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState(0)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [walletRes, subRes, refRes] = await Promise.all([
        tokensAPI.getBalance(),
        subscriptionPlansAPI.mySubscription().catch(() => ({ subscription: null })),
        tokensAPI.getReferrals().catch(() => null),
      ])
      const walletData = walletRes?.data ?? walletRes ?? {}
      setWallet({
        balance: walletData.balance ?? 0,
        transactions: walletData.transactions ?? [],
      })
      setSubscription(subRes?.subscription ?? subRes?.data?.subscription ?? null)
      setReferrals(refRes?.data ?? refRes ?? null)
    } catch (err) {
      toast.error(err?.message || 'Failed to load token data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // Categorize ALL credits (lifetime, not just current balance composition).
  // The wallet balance is a single counter so we can't strictly attribute
  // it; what we can do is show how much came from each source historically.
  const chips = useMemo(() => {
    const credits = wallet.transactions.filter((t) => t.amount > 0)
    let fromPlan = 0, streak = 0, refer = 0
    for (const t of credits) {
      if (t.type === 'PURCHASE' || t.type === 'SUBSCRIPTION_REFRESH') fromPlan += t.amount
      else if (t.type === 'REFERRAL_BONUS') refer += t.amount
      else if (t.type === 'ADMIN_CREDIT') streak += t.amount
    }
    return { fromPlan, streak, refer }
  }, [wallet.transactions])

  const monthSpending = useMemo(() => {
    const since = startOfMonth()
    const debits = wallet.transactions.filter(
      (t) => t.type === 'QUIZ_CONSUMED' && new Date(t.createdAt) >= since,
    )
    let standard = 0, mock = 0
    for (const t of debits) {
      const used = Math.abs(t.amount)
      if (used >= 3) mock += used
      else standard += used
    }
    return { standard, mock, total: standard + mock }
  }, [wallet.transactions])

  const filteredTxns = useMemo(() => {
    const key = FILTERS[activeFilter].key
    return wallet.transactions.filter((t) => {
      const meta = TXN_META[t.type]
      if (!meta) return key === 'all'
      if (key === 'all') return true
      if (key === 'earned') return meta.kind === 'earned' || meta.kind === 'reset'
      if (key === 'spent') return meta.kind === 'spent'
      return true
    })
  }, [wallet.transactions, activeFilter])

  const tabCounts = useMemo(() => {
    const counts = { all: wallet.transactions.length, earned: 0, spent: 0 }
    for (const t of wallet.transactions) {
      const m = TXN_META[t.type]
      if (m?.kind === 'spent') counts.spent++
      else if (m?.kind === 'earned' || m?.kind === 'reset') counts.earned++
    }
    return counts
  }, [wallet.transactions])

  // Plan card derivations
  const planAllowance = subscription?.pricing?.tokenCount ?? 2
  const refreshDate = subscription?.nextRefreshDate ?? subscription?.endDate ?? null
  const daysLeftInCycle = refreshDate
    ? Math.max(0, Math.ceil((new Date(refreshDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null
  const cycleStart = subscription?.startDate ? new Date(subscription.startDate) : startOfMonth()
  const usedThisCycle = wallet.transactions
    .filter((t) => t.type === 'QUIZ_CONSUMED' && new Date(t.createdAt) >= cycleStart)
    .reduce((s, t) => s + Math.abs(t.amount), 0)
  const allowancePct = planAllowance > 0 ? Math.min(100, Math.round((usedThisCycle / planAllowance) * 100)) : 0

  // Referral stats for the "Refer up to 5 friends" tile
  const conversionCount = referrals?.successfulReferrals ?? 0
  const referralPct = Math.min(100, Math.round((conversionCount / 5) * 100))
  const referralEarned = referrals?.tokensEarned ?? 0

  // Streak (from auth context user). Bonus only fires when the user crosses
  // a NEW 7-day record, so the next milestone is gated on longestStreak —
  // not the current streak counter. Rebuilding a streak you've already hit
  // doesn't earn a token, so we shouldn't pretend it's "X days to next bonus".
  const streak = user?.streak ?? 0
  const longestStreak = user?.longestStreak ?? 0
  const STREAK_CYCLE = 7
  const highWater = Math.max(streak, longestStreak)
  const nextMilestone = Math.ceil((highWater + 1) / STREAK_CYCLE) * STREAK_CYCLE
  const daysToNextStreakBonus = Math.max(0, nextMilestone - streak)
  const streakInCycle = Math.max(0, STREAK_CYCLE - daysToNextStreakBonus)
  const streakPct = Math.round((streakInCycle / STREAK_CYCLE) * 100)

  return (
    <div className="main">
      <div className="page-head">
        <div className="crumb">/ Account / Tokens</div>
        <h1>Your token wallet</h1>
        <p className="sub">One token = one quiz attempt. Earn them by showing up, spend them on questions, watch the balance tick.</p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: 80, color: 'var(--rr-fg-muted)' }}>
          <Loader2 size={22} className="rc-spin" />
        </div>
      ) : (
        <>
          <div className="wallet-hero">
            <div className="wallet-left">
              <span className="lbl">Available balance</span>
              <div className="balance-row">
                <span className="balance-num">{wallet.balance}</span>
                <span className="balance-unit">tokens</span>
              </div>
              <p className="balance-sub">
                Worth <b>{wallet.balance} quiz attempts</b>, or <b>{Math.floor(wallet.balance / 3)} mock tests</b>, or any mix in between.
              </p>

              <div className="balance-chips">
                <span className="bal-chip"><Coins size={13} />From plan <b>{chips.fromPlan}</b></span>
                {chips.streak > 0 && <span className="bal-chip"><Flame size={13} />Streak bonus <b>+{chips.streak}</b></span>}
                {chips.refer > 0 && <span className="bal-chip"><Gift size={13} />Referrals <b>+{chips.refer}</b></span>}
              </div>
            </div>

            <div className="wallet-right">
              <h3>Your plan · {planName || 'Free'}</h3>
              <div>
                <div className="row-bw" style={{ marginBottom: 8 }}>
                  <span>Allowance this cycle</span>
                  <span><b>{usedThisCycle}</b> / {planAllowance} used</span>
                </div>
                <div className="wallet-meter"><div className="fill" style={{ width: `${allowancePct}%` }}></div></div>
              </div>
              <hr />
              <div className="row-bw">
                <span>{refreshDate ? 'Next refresh' : 'Resets on'}</span>
                <span><b>{refreshDate ? new Date(refreshDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</b></span>
              </div>
              {daysLeftInCycle != null && (
                <div className="row-bw">
                  <span>Days left in cycle</span>
                  <span><b>{daysLeftInCycle}</b> days</span>
                </div>
              )}
              <hr />
              <div className="cta-line">
                <Link to="/app/pricing" className="btn btn-lime" style={{ flex: 1 }}>
                  <ArrowUp size={14} />{subscription ? 'Change plan' : 'Upgrade plan'}
                </Link>
              </div>
            </div>
          </div>

          <div className="row-2">
            <div className="dcard">
              <div className="dcard-head">
                <div>
                  <h2>Earn more tokens</h2>
                  <span className="sub">Two ways to top up without paying — show up, refer.</span>
                </div>
              </div>
              <div className="earn-grid">
                <div className="earn-tile streak">
                  <div className="top">
                    <div className="ico"><Flame size={18} /></div>
                    <span className="reward">+1 token</span>
                  </div>
                  <h4>Set a new streak record</h4>
                  <p>+1 token each time you push your streak past a new {STREAK_CYCLE}-day mark — {nextMilestone}, {nextMilestone + STREAK_CYCLE}, and beyond.</p>
                  <div className="progress-label">
                    <span>{streak} / {nextMilestone} days · next bonus</span>
                    <span>{daysToNextStreakBonus === 0 ? 'available' : `${daysToNextStreakBonus} day${daysToNextStreakBonus === 1 ? '' : 's'}`}</span>
                  </div>
                  <div className="meter"><div className="fill" style={{ width: `${streakPct}%` }}></div></div>
                </div>

                <div className="earn-tile refer">
                  <div className="top">
                    <div className="ico"><Gift size={18} /></div>
                    <span className="reward">+2 tokens each</span>
                  </div>
                  <h4>Refer up to 5 friends</h4>
                  <p>2 tokens for you and 2 for them — the moment they buy any paid plan.</p>
                  <div className="progress-label">
                    <span>{conversionCount} of 5 referrals converted</span>
                    <span>+{referralEarned} tokens earned</span>
                  </div>
                  <div className="meter"><div className="fill" style={{ width: `${referralPct}%` }}></div></div>
                </div>
              </div>
            </div>

            <div className="dcard">
              <div className="dcard-head">
                <div>
                  <h2>Spending breakdown</h2>
                  <span className="sub">{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} · so far</span>
                </div>
              </div>
              {monthSpending.total === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--rr-fg-muted)', fontSize: 13 }}>
                  No tokens spent this month yet.
                </div>
              ) : (
                <>
                  <div className="spend-list">
                    {monthSpending.standard > 0 && (
                      <div className="spend-row">
                        <span className="name"><span className="d" style={{ background: 'var(--rr-violet-500)' }}></span>Standard quizzes</span>
                        <div className="bar"><div className="fill" style={{ width: `${Math.min(100, (monthSpending.standard / monthSpending.total) * 100)}%`, background: 'var(--rr-violet-500)' }}></div></div>
                        <span className="amt">{monthSpending.standard}</span>
                      </div>
                    )}
                    {monthSpending.mock > 0 && (
                      <div className="spend-row">
                        <span className="name"><span className="d" style={{ background: 'var(--rr-cyan-500)' }}></span>Mock tests</span>
                        <div className="bar"><div className="fill" style={{ width: `${Math.min(100, (monthSpending.mock / monthSpending.total) * 100)}%`, background: 'var(--rr-cyan-500)' }}></div></div>
                        <span className="amt">{monthSpending.mock}</span>
                      </div>
                    )}
                  </div>
                  <div className="spend-total">
                    <span className="label">Spent · this month</span>
                    <span className="total">{monthSpending.total}<small> tokens</small></span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="how-card">
            <div>
              <span className="lbl-line">How it works</span>
              <h3 style={{ marginTop: 6 }}>What costs what.</h3>
              <p style={{ fontSize: 13, color: 'var(--rr-fg-muted)', margin: '4px 0 0', lineHeight: 1.5 }}>Cheat sheet for token spend. Bigger questions cost more.</p>
            </div>
            <div className="how-list">
              <div className="how-cost">
                <div className="coin">1</div>
                <div className="text">
                  <span className="lbl">Standard quiz</span>
                  <span className="sub">20-question set · 12–18 min</span>
                </div>
              </div>
              <div className="how-cost">
                <div className="coin">3</div>
                <div className="text">
                  <span className="lbl">Mock test</span>
                  <span className="sub">Full-length · 90 Qs · 3 hours</span>
                </div>
              </div>
            </div>
          </div>

          <div className="dcard log-card">
            <div className="log-head">
              <div>
                <h2>Activity</h2>
                <span className="sub">Every token in, every token out — last {wallet.transactions.length} transactions.</span>
              </div>
              <div className="log-filters">
                {FILTERS.map((f, i) => {
                  const count = tabCounts[f.key] ?? 0
                  return (
                    <button
                      key={f.key}
                      className={`chip${activeFilter === i ? ' on' : ''}`}
                      onClick={() => setActiveFilter(i)}
                    >
                      {f.label} <span className="n">{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {filteredTxns.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--rr-fg-muted)', fontSize: 13 }}>
                No transactions to show.
              </div>
            ) : (
              <table className="log-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Source</th>
                    <th>Date</th>
                    <th>Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxns.map((t) => {
                    const meta = TXN_META[t.type] || { label: t.type, icon: Coins, kind: 'earned', tone: 'earned' }
                    const Icon = meta.icon
                    const isCredit = t.amount > 0
                    const amtClass = meta.kind === 'spent' ? 'neg' : meta.kind === 'reset' ? 'neutral' : 'pos'
                    return (
                      <tr key={t.id} data-row-type={meta.kind}>
                        <td>
                          <span className={`log-type ${meta.tone}`}>
                            <div className="ico"><Icon size={13} /></div>
                            <span className="lbl-text">{meta.label}</span>
                          </span>
                        </td>
                        <td>
                          <span className="source">
                            {t.description || meta.label}
                            {t.price != null && <small>Paid ₹{Math.round(t.price)}</small>}
                            {t.balanceAfter != null && t.price == null && <small>Balance after: {t.balanceAfter}</small>}
                          </span>
                        </td>
                        <td><span className="date">{formatDate(t.createdAt)}</span></td>
                        <td className={`amt ${amtClass}`}>{isCredit ? '+' : ''}{t.amount}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            <div className="log-foot">
              <span>Showing {filteredTxns.length} of {wallet.transactions.length} transactions</span>
              <button className="link-btn" onClick={() => exportCSV(filteredTxns)} disabled={filteredTxns.length === 0}>
                Export CSV →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function exportCSV(txns) {
  if (!txns.length) return
  const header = ['Date', 'Type', 'Amount', 'Balance after', 'Description', 'Reference ID', 'Paid (₹)']
  const lines = [header.join(',')]
  for (const t of txns) {
    lines.push([
      new Date(t.createdAt).toISOString(),
      t.type,
      t.amount,
      t.balanceAfter ?? '',
      JSON.stringify(t.description || ''),
      t.referenceId || '',
      t.price ?? '',
    ].join(','))
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rankrush-tokens-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
