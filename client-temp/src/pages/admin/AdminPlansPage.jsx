import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Banknote, Users, Percent, CircleOff, ArrowUp, Eye, Plus,
  Filter, Download,
} from 'lucide-react'
import PlanCard from '../../components/admin/PlanCard'
import PlanEditModal from '../../components/admin/PlanEditModal'
import { subscriptionPlansAPI } from '../../services/api'
import './AdminPlansPage.css'

const TX = [
  { initial: 'A', bg: 'var(--rr-amber-500)', name: 'Aanya Gupta', email: 'aanya.g@gmail.com', plan: 'Pro', planClass: 'pro', cadence: 'Monthly', when: '14m ago', amount: '+₹299', amountClass: 'pos', status: 'Paid' },
  { initial: 'T', bg: 'var(--rr-violet-500)', name: 'Tanvi Sharma', email: 'tanvi.s@gmail.com', plan: 'Starter', planClass: 'starter', cadence: 'Annual', when: '2h ago', amount: '+₹990', amountClass: 'pos', status: 'Paid' },
  { initial: 'R', bg: 'var(--rr-cyan-500)', name: 'Rohan Mehra', email: 'rohan.m@gmail.com', plan: 'Pro', planClass: 'pro', cadence: 'Monthly', when: '4h ago', amount: '+₹299', amountClass: 'pos', status: 'Paid' },
]

export default function AdminPlansPage() {
  const [plans, setPlans] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subChartPeriod, setSubChartPeriod] = useState('90d')
  const [editing, setEditing] = useState(null) // { plan } | { plan: null } for new

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [plansRes, statsRes] = await Promise.all([
        subscriptionPlansAPI.getAll(),
        subscriptionPlansAPI.getStats().catch(() => null),
      ])
      const list = Array.isArray(plansRes) ? plansRes : (plansRes?.data ?? [])
      setPlans(list)
      setStats(statsRes?.data || statsRes || null)
    } catch (err) {
      toast.error(err?.message || 'Failed to load plans')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleToggleActive = async (plan, isActive) => {
    try {
      await subscriptionPlansAPI.toggleStatus(plan.id, isActive)
      toast.success(`${plan.name} ${isActive ? 'activated' : 'paused'}`)
      loadAll()
    } catch (err) {
      toast.error(err?.message || 'Failed to toggle status')
    }
  }

  const handleSave = async (payload) => {
    try {
      if (editing?.plan?.id) {
        await subscriptionPlansAPI.update(editing.plan.id, payload)
        toast.success(`${payload.name} updated`)
      } else {
        await subscriptionPlansAPI.create(payload)
        toast.success(`${payload.name} created`)
      }
      setEditing(null)
      loadAll()
    } catch (err) {
      toast.error(err?.message || 'Failed to save plan')
    }
  }

  const activePlans = plans.filter((p) => p.isActive)
  const totalSubs = plans.reduce((sum, p) => sum + (p.subscriberCount || 0), 0)

  return (
    <div className="admin-main">
      {/* Page header */}
      <div className="page-head">
        <div>
          <div className="crumb">Monetisation / Plans</div>
          <h1>Pricing plans</h1>
          <p className="sub">
            {loading
              ? 'Loading…'
              : `${activePlans.length} active plan${activePlans.length === 1 ? '' : 's'} · ${totalSubs.toLocaleString('en-IN')} subscribers${stats?.totalRevenue ? ` · ₹${Math.round(stats.totalRevenue).toLocaleString('en-IN')} lifetime` : ''}.`}
          </p>
        </div>
        <div className="head-actions">
          <a href="/app/pricing" target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
            <Eye size={12} />Preview public page
          </a>
          <button className="btn btn-accent btn-sm" onClick={() => setEditing({ plan: null })}>
            <Plus size={12} />New plan
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-strip">
        <div className="cell">
          <div className="lbl"><Banknote size={12} />Lifetime revenue</div>
          <div className="v">₹{Math.round(stats?.totalRevenue || 0).toLocaleString('en-IN')}</div>
          <span className="delta"><ArrowUp size={12} />real-time</span>
        </div>
        <div className="cell">
          <div className="lbl"><Users size={12} />Paying subscribers</div>
          <div className="v">{(stats?.totalSubscribers || 0).toLocaleString('en-IN')}</div>
          <span className="delta">across {plans.length} plan{plans.length === 1 ? '' : 's'}</span>
        </div>
        <div className="cell">
          <div className="lbl"><Percent size={12} />Active plans</div>
          <div className="v">{stats?.activePlans ?? activePlans.length}</div>
          <span className="delta">of {stats?.totalPlans ?? plans.length} total</span>
        </div>
        <div className="cell">
          <div className="lbl"><CircleOff size={12} />Monthly churn</div>
          <div className="v">—</div>
          <span className="delta">coming soon</span>
        </div>
      </div>

      {/* Plans section title */}
      <div className="sec-title">
        <h2>Plans</h2>
        <span className="sub">Cadences and features are managed here. Changes go live immediately on the student pricing page.</span>
      </div>

      {/* Plan cards */}
      {loading ? (
        <div className="plans-admin">
          {[0, 1, 2].map((i) => <div key={i} className="pa-card skeleton" />)}
        </div>
      ) : (
        <div className="plans-admin">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              subscriberCount={plan.subscriberCount}
              onEdit={() => setEditing({ plan })}
              onToggleActive={(next) => handleToggleActive(plan, next)}
            />
          ))}
        </div>
      )}

      {/* Add plan tile */}
      {!loading && (
        <div style={{ marginBottom: 28 }}>
          <div className="pa-card add" onClick={() => setEditing({ plan: null })} style={{ cursor: 'pointer' }}>
            <div className="ico"><Plus size={18} /></div>
            <div>
              <h4>Add a new plan</h4>
              <p>e.g. an institutional tier, a 6-month plan, or a region-specific price.</p>
            </div>
          </div>
        </div>
      )}

      {/* Subscriber growth chart (placeholder — drop in real series later) */}
      <div className="sub-chart">
        <div className="sub-chart-head">
          <div>
            <h3>Subscriber growth · 90 days</h3>
            <p className="sub">Cumulative active subscribers per plan</p>
          </div>
          <div className="period-tabs">
            {['30d', '90d', 'All'].map((p) => (
              <button key={p} className={subChartPeriod === p ? 'on' : ''} onClick={() => setSubChartPeriod(p)}>{p}</button>
            ))}
          </div>
        </div>
        <div className="sub-chart-area">
          <div className="sub-chart-legend">
            {plans.map((p, i) => (
              <div className="row" key={p.id}>
                <span className="head">
                  <span className="d" style={{ background: ['var(--rr-fg-muted)', 'var(--rr-violet-500)', 'var(--rr-lime-500)'][i % 3] }} />
                  {p.name}
                </span>
                <span className="v">{(p.subscriberCount || 0).toLocaleString('en-IN')}</span>
                <small style={{ color: 'var(--rr-emerald-500)', fontWeight: 600 }}>live</small>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent transactions (placeholder) */}
      <div className="acard">
        <div className="acard-head" style={{ padding: '18px 22px' }}>
          <div>
            <h3>Recent transactions</h3>
            <p className="sub">Sample data — wire to /admin/payments for live feed.</p>
          </div>
          <div className="head-actions">
            <button className="btn btn-secondary btn-sm"><Filter size={12} />Filter</button>
            <button className="btn btn-secondary btn-sm"><Download size={12} />Export</button>
          </div>
        </div>
        <table className="atable tx-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Plan</th>
              <th>Cadence</th>
              <th>Date</th>
              <th className="right">Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {TX.map((t, i) => (
              <tr key={i}>
                <td>
                  <div className="friend-mini">
                    <div className="av" style={{ background: t.bg }}>{t.initial}</div>
                    <div>
                      <span className="nm">{t.name}</span>
                      <span className="em">{t.email}</span>
                    </div>
                  </div>
                </td>
                <td><span className={`plan-tag ${t.planClass}`}>{t.plan}</span></td>
                <td>{t.cadence}</td>
                <td><span style={{ fontFamily: 'var(--rr-font-mono)', fontSize: 11, color: 'var(--rr-fg-muted)' }}>{t.when}</span></td>
                <td><span className={`amount ${t.amountClass}`}>{t.amount}</span></td>
                <td><span className={`status-pill ${t.statusClass || 'published'}`}>{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PlanEditModal
        open={!!editing}
        plan={editing?.plan ?? null}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />
    </div>
  )
}
