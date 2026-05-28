import { Edit, MoreVertical, CircleCheck, Pause, Play, Leaf, Rocket, Crown, Sparkles, Star, Zap, Gem, Shield } from 'lucide-react'

const ICON_MAP = {
  leaf: Leaf, rocket: Rocket, crown: Crown, sparkles: Sparkles,
  star: Star, zap: Zap, gem: Gem, shield: Shield,
}

function formatCurrency(value, currency = 'INR') {
  if (value == null) return ''
  const symbol = currency === 'INR' ? '₹' : currency + ' '
  return `${symbol}${Number(value).toLocaleString('en-IN')}`
}

function cadenceLabel(cadence) {
  switch (cadence) {
    case 'MONTHLY': return '/month'
    case 'ANNUAL':  return '/year'
    case 'ONE_TIME': return 'one-time'
    default: return ''
  }
}

function cadenceShort(cadence) {
  switch (cadence) {
    case 'MONTHLY': return 'monthly'
    case 'ANNUAL':  return 'annual'
    case 'ONE_TIME': return 'one-time'
    default: return ''
  }
}

export default function PlanCard({
  plan,
  subscriberCount = 0,
  onEdit,
  onToggleActive,
}) {
  const Icon = ICON_MAP[(plan.icon || '').toLowerCase()] || Leaf
  const featured = plan.isPopular
  const pricings = plan.pricings || []
  const cardFeatures = (plan.features || []).filter((f) => f.showOnCard)
  const updatedText = plan.updatedAt
    ? new Date(plan.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div className={`pa-card${featured ? ' featured' : ''}${plan.isActive ? '' : ' inactive'}`}>
      <div className="pa-head">
        <div className="title">
          <h3>
            <Icon size={18} style={{ color: featured ? 'var(--rr-violet-500)' : 'var(--rr-fg-muted)' }} />
            {plan.name}
          </h3>
          <span className="desc">{plan.description}</span>
        </div>
        <div className="right" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span className={`status-pill ${plan.isActive ? 'published' : 'expired'}`}>
            {plan.isActive ? 'Live' : 'Paused'}
          </span>
          <button className="row-act" title="Edit" onClick={onEdit}><Edit size={14} /></button>
          <button
            className="row-act"
            title={plan.isActive ? 'Pause plan' : 'Resume plan'}
            onClick={() => onToggleActive(!plan.isActive)}
          >
            {plan.isActive ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button className="row-act" title="More"><MoreVertical size={14} /></button>
        </div>
      </div>

      <div className="pa-meta">
        <div className="item">
          <span className="lbl">Subscribers</span>
          <span className="val">{subscriberCount.toLocaleString('en-IN')}</span>
        </div>
        <div className="item">
          <span className="lbl">Cadences</span>
          <span className="val">{pricings.length}</span>
        </div>
      </div>

      <div className="pa-body">
        {pricings.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--rr-fg-muted)', padding: '8px 0' }}>
            No pricing variants — edit to add.
          </div>
        )}
        {pricings.map((p, i) => (
          <div className="cadence-section" key={p.id || i}>
            {i === 0 && (
              <div className="cs-head">
                <span className="lbl">Pricing variants</span>
              </div>
            )}
            <div className={`cadence-row${p.isActive ? '' : ' inactive'}`}>
              <div>
                <span className="price">{formatCurrency(p.price, plan.currency)}</span>
                <span className="price-per">{cadenceLabel(p.cadence)}{p.note ? ` · ${p.note}` : ''}</span>
              </div>
              <div className="subs">
                <span className="n">{p.tokenCount}</span>
                <small>tokens</small>
              </div>
              <div className="actions" style={{ fontFamily: 'var(--rr-font-mono)', fontSize: 10, color: 'var(--rr-fg-muted)' }}>
                {cadenceShort(p.cadence)}
              </div>
            </div>
          </div>
        ))}

        <div className="feat-section" style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--rr-border)' }}>
          <div className="lbl" style={{ fontFamily: 'var(--rr-font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--rr-fg-muted)', marginBottom: 8 }}>
            Card features ({cardFeatures.length})
          </div>
          <div className="feat-list" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {cardFeatures.slice(0, 6).map((f) => (
              <span key={f.id} className="feat" style={{ fontSize: 12, color: 'var(--rr-fg-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CircleCheck size={13} style={{ color: f.included ? 'var(--rr-emerald-500)' : 'var(--rr-fg-muted)', flexShrink: 0 }} />
                {f.valueType === 'TEXT' || f.valueType === 'NUMBER'
                  ? `${f.label}${f.value ? ` — ${f.value}` : ''}`
                  : f.label}
              </span>
            ))}
            {cardFeatures.length > 6 && (
              <span style={{ fontSize: 11, color: 'var(--rr-fg-muted)' }}>
                +{cardFeatures.length - 6} more
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="pa-foot">
        <span className="meta" style={{ fontFamily: 'var(--rr-font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--rr-fg-muted)' }}>
          Updated <b style={{ color: 'var(--rr-fg)', fontFamily: 'var(--rr-font-display)', fontSize: 14, fontWeight: 700 }}>{updatedText}</b>
        </span>
        <button className={`btn btn-${featured ? 'accent' : 'secondary'} btn-sm`} onClick={onEdit}>
          <Edit size={12} />Edit plan
        </button>
      </div>
    </div>
  )
}
