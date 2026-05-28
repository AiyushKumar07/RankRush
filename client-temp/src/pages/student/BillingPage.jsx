import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Crown, Leaf, Rocket, Sparkles, Star, Zap, Gem, Shield,
  Receipt, Calendar, RefreshCw, ArrowUp, ArrowRight, AlertTriangle,
  Download, CheckCircle2, XCircle, Clock, Filter,
} from 'lucide-react'
import { paymentsAPI, subscriptionPlansAPI } from '../../services/api'
import './BillingPage.css'

const ICON_MAP = {
  leaf: Leaf, rocket: Rocket, crown: Crown, sparkles: Sparkles,
  star: Star, zap: Zap, gem: Gem, shield: Shield,
}

const CADENCE_LABELS = { MONTHLY: 'Monthly', ANNUAL: 'Annual', ONE_TIME: 'One-time' }

const STATUS_META = {
  SUCCESS: { label: 'Paid', icon: CheckCircle2, cls: 'pos' },
  PENDING: { label: 'Pending', icon: Clock, cls: 'warn' },
  FAILED: { label: 'Failed', icon: XCircle, cls: 'neg' },
  REFUNDED: { label: 'Refunded', icon: RefreshCw, cls: 'neutral' },
}

const FILTERS = ['All', 'Paid', 'Pending', 'Failed']

function formatCurrency(amount, currency = 'INR') {
  if (amount == null) return '—'
  const symbol = currency === 'INR' ? '₹' : currency + ' '
  return `${symbol}${Math.round(amount).toLocaleString('en-IN')}`
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysBetween(from, to) {
  if (!from || !to) return null
  const ms = new Date(to).getTime() - new Date(from).getTime()
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}

function getIcon(key) {
  return ICON_MAP[(key || '').toLowerCase()] || Crown
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [filter, setFilter] = useState('All')

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [subRes, historyRes] = await Promise.all([
        subscriptionPlansAPI.mySubscription().catch(() => ({ subscription: null })),
        paymentsAPI.getHistory().catch(() => []),
      ])
      setSubscription(subRes?.subscription ?? subRes?.data?.subscription ?? null)
      const list = Array.isArray(historyRes) ? historyRes : (historyRes?.data ?? [])
      setHistory(list)
    } catch (err) {
      toast.error(err?.message || 'Failed to load billing details')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleCancel = async () => {
    if (!subscription) return
    const ok = window.confirm(
      `Cancel auto-renew?\n\nYou'll keep ${subscription.plan?.name} access until ${formatDate(subscription.endDate)}, then drop to Free.`,
    )
    if (!ok) return
    setCancelling(true)
    try {
      await subscriptionPlansAPI.cancelMySubscription()
      toast.success("Auto-renew off. You're good until the cycle ends.")
      loadAll()
    } catch (err) {
      toast.error(err?.message || 'Failed to cancel subscription')
    } finally {
      setCancelling(false)
    }
  }

  const filteredHistory = useMemo(() => {
    if (filter === 'All') return history
    const target = filter === 'Paid' ? 'SUCCESS' : filter === 'Pending' ? 'PENDING' : 'FAILED'
    return history.filter((tx) => tx.status === target)
  }, [history, filter])

  const totals = useMemo(() => {
    const paid = history.filter((t) => t.status === 'SUCCESS')
    return {
      lifetime: paid.reduce((s, t) => s + (t.amount || 0), 0),
      count: paid.length,
      lastPaid: paid[0]?.createdAt ?? null,
    }
  }, [history])

  return (
    <div className="main">
      <div className="page-head">
        <div className="crumb">/ Account / Billing</div>
        <h1>Billing & subscription</h1>
        <p className="sub">Your active plan, every receipt, and the off-switch. Cancel any time — you'll keep access until the cycle ends.</p>
      </div>

      {loading ? (
        <div className="billing-skeleton">
          <div className="sk-card" />
          <div className="sk-strip" />
          <div className="sk-card tall" />
        </div>
      ) : (
        <>
          <SubscriptionCard
            subscription={subscription}
            onCancel={handleCancel}
            cancelling={cancelling}
          />

          <div className="bill-stats">
            <StatCell label="Lifetime paid" value={formatCurrency(totals.lifetime)} sub={`across ${totals.count} purchase${totals.count === 1 ? '' : 's'}`} />
            <StatCell label="Last payment" value={totals.lastPaid ? formatDate(totals.lastPaid) : '—'} sub={totals.lastPaid ? 'success' : 'no payments yet'} />
            <StatCell
              label="Next renewal"
              value={subscription?.endDate ? formatDate(subscription.endDate) : '—'}
              sub={
                subscription
                  ? subscription.isAutoRenewEnabled
                    ? `auto-renew on · ${daysBetween(new Date(), subscription.endDate) ?? 0} days left`
                    : 'auto-renew off · expires then'
                  : 'no active plan'
              }
            />
          </div>

          <HistoryCard
            history={filteredHistory}
            totalCount={history.length}
            filter={filter}
            onFilter={setFilter}
          />
        </>
      )}
    </div>
  )
}

function SubscriptionCard({ subscription, onCancel, cancelling }) {
  if (!subscription) {
    return (
      <div className="sub-hero empty">
        <div>
          <span className="lbl-line">No active subscription</span>
          <h2>You're on <span className="accent">Free</span>.</h2>
          <p>2 tokens a month, forever. Upgrade when you want a bigger allowance and the full PYQ vault.</p>
          <div className="row" style={{ marginTop: 18 }}>
            <Link to="/app/pricing" className="btn btn-lime btn-lg">
              <Crown size={14} />See plans <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        <div className="empty-art" aria-hidden>
          <Leaf size={56} />
        </div>
      </div>
    )
  }

  const Icon = getIcon(subscription.plan?.icon)
  const cadenceLabel = CADENCE_LABELS[subscription.cadence] || subscription.cadence || 'Recurring'
  const daysLeft = daysBetween(new Date(), subscription.endDate)
  const totalDays = subscription.startDate && subscription.endDate
    ? daysBetween(subscription.startDate, subscription.endDate)
    : null
  const usedDays = totalDays && daysLeft != null ? Math.max(0, totalDays - daysLeft) : null
  const progressPct = totalDays && usedDays != null ? Math.min(100, Math.round((usedDays / totalDays) * 100)) : 0
  const autoRenew = subscription.isAutoRenewEnabled

  return (
    <div className="sub-hero">
      <div className="sub-left">
        <span className="lbl-line">Current subscription</span>
        <h2>
          <Icon size={22} />
          {subscription.plan?.name || 'Plan'}
          <span className="cadence-pill">{cadenceLabel}</span>
        </h2>
        <p className="desc">{subscription.plan?.description || ''}</p>

        <div className="sub-meter-wrap">
          <div className="sub-meter"><div className="fill" style={{ width: `${progressPct}%` }} /></div>
          <div className="sub-meter-row">
            <span><b>{usedDays ?? 0}</b> of {totalDays ?? '—'} days used</span>
            <span>{daysLeft != null ? <><b>{daysLeft}</b> days left</> : '—'}</span>
          </div>
        </div>

        <div className="sub-actions">
          {autoRenew ? (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onCancel}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling…' : <><AlertTriangle size={12} />Cancel auto-renew</>}
            </button>
          ) : (
            <span className="cancel-pill">
              <AlertTriangle size={12} />Auto-renew off — expires {formatDate(subscription.endDate)}
            </span>
          )}
          <Link to="/app/pricing" className="btn btn-lime btn-sm">
            <ArrowUp size={12} />Change plan
          </Link>
        </div>
      </div>

      <div className="sub-right">
        <div className="row-bw">
          <span><Calendar size={13} />Started</span>
          <span><b>{formatDate(subscription.startDate)}</b></span>
        </div>
        <div className="row-bw">
          <span><RefreshCw size={13} />Next token refresh</span>
          <span><b>{subscription.nextRefreshDate ? formatDate(subscription.nextRefreshDate) : '—'}</b></span>
        </div>
        <div className="row-bw">
          <span><Clock size={13} />Cycle ends</span>
          <span><b>{formatDate(subscription.endDate)}</b></span>
        </div>
        <hr />
        <div className="row-bw">
          <span>Tokens per refresh</span>
          <span><b>{subscription.pricing?.tokenCount ?? '—'}</b> tokens</span>
        </div>
        <div className="row-bw">
          <span>Paid per cycle</span>
          <span><b>{formatCurrency(subscription.pricing?.price)}</b></span>
        </div>
      </div>
    </div>
  )
}

function StatCell({ label, value, sub }) {
  return (
    <div className="bs-cell">
      <div className="bs-lbl">{label}</div>
      <div className="bs-v">{value}</div>
      <span className="bs-sub">{sub}</span>
    </div>
  )
}

function HistoryCard({ history, totalCount, filter, onFilter }) {
  return (
    <div className="dcard log-card">
      <div className="log-head">
        <div>
          <h2>Payment history</h2>
          <span className="sub">Every order, every receipt — newest first.</span>
        </div>
        <div className="log-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`chip${filter === f ? ' on' : ''}`}
              onClick={() => onFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="empty-row">
          <Receipt size={28} />
          <span>{filter === 'All' ? 'No purchases yet.' : `No ${filter.toLowerCase()} transactions.`}</span>
        </div>
      ) : (
        <table className="log-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Plan</th>
              <th>Cadence</th>
              <th>Amount</th>
              <th>Status</th>
              <th className="right">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {history.map((tx) => {
              const meta = STATUS_META[tx.status] || STATUS_META.PENDING
              const StatusIcon = meta.icon
              const PlanIcon = getIcon(tx.planIcon)
              return (
                <tr key={tx.id}>
                  <td><span className="date">{formatDate(tx.createdAt)}</span></td>
                  <td>
                    <span className="plan-cell">
                      <PlanIcon size={14} />
                      <b>{tx.planName || 'Plan'}</b>
                    </span>
                  </td>
                  <td>{CADENCE_LABELS[tx.cadence] || '—'}</td>
                  <td><b className="amt-strong">{formatCurrency(tx.amount, tx.currency)}</b></td>
                  <td>
                    <span className={`status-pill ${meta.cls}`}>
                      <StatusIcon size={12} />{meta.label}
                    </span>
                  </td>
                  <td className="right">
                    {tx.status === 'SUCCESS' ? (
                      <button
                        className="receipt-btn"
                        onClick={() => downloadReceipt(tx)}
                        title="Download receipt"
                      >
                        <Download size={13} />
                      </button>
                    ) : <span className="muted">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <div className="log-foot">
        <span>Showing {history.length} of {totalCount} transaction{totalCount === 1 ? '' : 's'}</span>
        {history.length > 0 && (
          <button className="link-btn" onClick={() => exportCSV(history)}>
            <Filter size={12} />Export CSV
          </button>
        )}
      </div>
    </div>
  )
}

function downloadReceipt(tx) {
  const html = receiptHTML(tx)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `receipt-${tx.gatewayPaymentId || tx.id}.html`
  a.click()
  URL.revokeObjectURL(url)
}

function receiptHTML(tx) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>RankRush Receipt · ${tx.id}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 40px auto; padding: 0 24px; color: #0E0E13; }
  h1 { font-size: 22px; letter-spacing: -0.02em; margin: 0 0 4px; }
  .crumb { font-size: 11px; color: #777; text-transform: uppercase; letter-spacing: 0.14em; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  td { padding: 12px 0; border-bottom: 1px solid #eee; font-size: 14px; }
  td:last-child { text-align: right; font-weight: 600; }
  .total td { font-size: 18px; font-weight: 700; border-bottom: 0; padding-top: 18px; }
  .meta { color: #777; font-size: 12px; margin-top: 32px; }
</style></head>
<body>
  <span class="crumb">Receipt · RankRush</span>
  <h1>Payment confirmed</h1>
  <p>${new Date(tx.createdAt).toLocaleString('en-IN')}</p>
  <table>
    <tr><td>Plan</td><td>${tx.planName || '—'}</td></tr>
    <tr><td>Cadence</td><td>${CADENCE_LABELS[tx.cadence] || '—'}</td></tr>
    <tr><td>Payment ID</td><td>${tx.gatewayPaymentId || '—'}</td></tr>
    <tr><td>Order ID</td><td>${tx.gatewayOrderId || '—'}</td></tr>
    ${tx.redeemCode ? `<tr><td>Redeem code</td><td>${tx.redeemCode}</td></tr>` : ''}
    <tr class="total"><td>Total paid</td><td>${tx.currency === 'INR' ? '₹' : tx.currency + ' '}${Math.round(tx.amount).toLocaleString('en-IN')}</td></tr>
  </table>
  <p class="meta">RankRush · receipt generated ${new Date().toLocaleString('en-IN')}</p>
</body></html>`
}

function exportCSV(rows) {
  const header = ['Date', 'Plan', 'Cadence', 'Amount', 'Currency', 'Status', 'Payment ID', 'Redeem code']
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push([
      new Date(r.createdAt).toISOString(),
      JSON.stringify(r.planName || ''),
      r.cadence || '',
      r.amount ?? '',
      r.currency || '',
      r.status,
      r.gatewayPaymentId || '',
      r.redeemCode || '',
    ].join(','))
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rankrush-billing-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
