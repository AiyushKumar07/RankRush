import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Modal from '../ui/Modal'
import Select from '../ui/Select'
import './PlanEditModal.css'

const CADENCE_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'ONE_TIME', label: 'One-time' },
]

const VALUE_TYPE_OPTIONS = [
  { value: 'CHECK', label: 'Check (✓)' },
  { value: 'CROSS', label: 'Cross (—)' },
  { value: 'TEXT', label: 'Text value' },
  { value: 'NUMBER', label: 'Number value' },
]

const ICON_OPTIONS = [
  { value: 'leaf', label: 'Leaf' },
  { value: 'rocket', label: 'Rocket' },
  { value: 'crown', label: 'Crown' },
  { value: 'sparkles', label: 'Sparkles' },
  { value: 'star', label: 'Star' },
  { value: 'zap', label: 'Zap' },
  { value: 'gem', label: 'Gem' },
  { value: 'shield', label: 'Shield' },
]

const CTA_VARIANT_OPTIONS = [
  { value: 'secondary', label: 'Secondary' },
  { value: 'accent', label: 'Accent (violet)' },
  { value: 'lime', label: 'Lime (Pro)' },
]

// Display-only features (icons, leaderboards, support tier) can leave this null.
// Set this only when the row should enforce server-side access.
const ENTITLEMENT_OPTIONS = [
  { value: '', label: '— None (display only) —' },
  { value: 'MOCK_TESTS', label: 'Mock tests (binary)' },
  { value: 'PYQ_ACCESS', label: 'PYQ access (binary + year cap from value)' },
  { value: 'TOPIC_INSIGHTS_DEPTH', label: 'Topic insights depth (cap from value)' },
  { value: 'TIME_PER_QUESTION', label: 'Time-per-question analytics' },
  { value: 'PERCENTILE_BREAKDOWN', label: 'Percentile breakdown' },
  { value: 'STUDY_GROUPS_MAX', label: 'Study groups max (cap from value)' },
  { value: 'FRIEND_CHALLENGES', label: 'Friend challenges' },
  { value: 'CHAT_DUELS', label: 'Chat & live duels' },
  { value: 'EARLY_ACCESS', label: 'Early access to new features' },
]

const emptyPricing = () => ({
  cadence: 'MONTHLY',
  price: 0,
  originalPrice: '',
  tokenCount: 0,
  tokenPeriodLabel: '',
  note: '',
  isActive: true,
})

const emptyFeature = () => ({
  sectionKey: 'tokens-quizzes',
  sectionLabel: 'Tokens & quizzes',
  label: '',
  valueType: 'CHECK',
  value: '',
  included: true,
  showOnCard: true,
  showInCompare: true,
  isComingSoon: false,
  entitlementKey: '',
  sortOrder: 0,
})

function buildInitialState(plan) {
  if (!plan) {
    return {
      name: '',
      description: '',
      icon: 'rocket',
      badge: '',
      ctaLabel: '',
      ctaVariant: 'secondary',
      currency: 'INR',
      isActive: true,
      isPopular: false,
      isFree: false,
      pricings: [emptyPricing()],
      features: [],
    }
  }
  return {
    name: plan.name ?? '',
    description: plan.description ?? '',
    icon: plan.icon ?? '',
    badge: plan.badge ?? '',
    ctaLabel: plan.ctaLabel ?? '',
    ctaVariant: plan.ctaVariant ?? 'secondary',
    currency: plan.currency ?? 'INR',
    isActive: plan.isActive ?? true,
    isPopular: plan.isPopular ?? false,
    isFree: plan.isFree ?? false,
    pricings: (plan.pricings ?? []).map((p) => ({
      cadence: p.cadence,
      price: p.price,
      originalPrice: p.originalPrice ?? '',
      tokenCount: p.tokenCount,
      tokenPeriodLabel: p.tokenPeriodLabel ?? '',
      note: p.note ?? '',
      isActive: p.isActive ?? true,
    })),
    features: (plan.features ?? []).map((f) => ({
      sectionKey: f.sectionKey,
      sectionLabel: f.sectionLabel,
      label: f.label,
      valueType: f.valueType,
      value: f.value ?? '',
      included: f.included ?? true,
      showOnCard: f.showOnCard ?? true,
      showInCompare: f.showInCompare ?? true,
      isComingSoon: f.isComingSoon ?? false,
      entitlementKey: f.entitlementKey ?? '',
      sortOrder: f.sortOrder ?? 0,
    })),
  }
}

export default function PlanEditModal({ open, plan, onClose, onSave }) {
  const [state, setState] = useState(() => buildInitialState(plan))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setState(buildInitialState(plan))
  }, [open, plan])

  const set = (patch) => setState((s) => ({ ...s, ...patch }))

  const updatePricing = (idx, patch) => {
    setState((s) => ({
      ...s,
      pricings: s.pricings.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }))
  }
  const addPricing = () => setState((s) => ({ ...s, pricings: [...s.pricings, emptyPricing()] }))
  const removePricing = (idx) =>
    setState((s) => ({ ...s, pricings: s.pricings.filter((_, i) => i !== idx) }))

  const updateFeature = (idx, patch) => {
    setState((s) => ({
      ...s,
      features: s.features.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    }))
  }
  const addFeature = () => setState((s) => ({ ...s, features: [...s.features, emptyFeature()] }))
  const removeFeature = (idx) =>
    setState((s) => ({ ...s, features: s.features.filter((_, i) => i !== idx) }))

  const handleSave = async () => {
    if (!state.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: state.name.trim(),
        description: state.description || null,
        icon: state.icon || null,
        badge: state.badge || null,
        ctaLabel: state.ctaLabel || null,
        ctaVariant: state.ctaVariant || null,
        currency: state.currency || 'INR',
        isActive: state.isActive,
        isPopular: state.isPopular,
        isFree: state.isFree,
        pricings: state.pricings.map((p) => ({
          cadence: p.cadence,
          price: Number(p.price) || 0,
          originalPrice: p.originalPrice === '' || p.originalPrice == null ? null : Number(p.originalPrice),
          tokenCount: Number(p.tokenCount) || 0,
          tokenPeriodLabel: p.tokenPeriodLabel || null,
          note: p.note || null,
          isActive: p.isActive ?? true,
        })),
        features: state.features.map((f, i) => ({
          sectionKey: f.sectionKey,
          sectionLabel: f.sectionLabel,
          label: f.label,
          valueType: f.valueType,
          value: f.value || null,
          included: f.included ?? true,
          showOnCard: f.showOnCard ?? true,
          showInCompare: f.showInCompare ?? true,
          isComingSoon: f.isComingSoon ?? false,
          entitlementKey: f.entitlementKey ? f.entitlementKey : null,
          sortOrder: f.sortOrder ?? i,
        })),
      }
      await onSave(payload)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={plan ? `Edit · ${plan.name}` : 'New plan'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" onClick={handleSave} disabled={saving || !state.name.trim()}>
            {saving ? 'Saving…' : 'Save plan'}
          </button>
        </div>
      }
    >
      <div className="plan-edit">
        <div className="pe-section">
          <div className="pe-title">Basics</div>
          <div className="pe-row">
            <label>Name<input value={state.name} onChange={(e) => set({ name: e.target.value })} placeholder="Starter" /></label>
            <label>Badge<input value={state.badge ?? ''} onChange={(e) => set({ badge: e.target.value })} placeholder="Most picked" /></label>
          </div>
          <label>Description<input value={state.description ?? ''} onChange={(e) => set({ description: e.target.value })} placeholder="For weekday-warriors building a habit." /></label>
          <div className="pe-row">
            <label>Icon
              <Select
                value={state.icon}
                onChange={(v) => set({ icon: v })}
                options={ICON_OPTIONS}
                placeholder="Pick icon"
              />
            </label>
            <label>CTA variant
              <Select
                value={state.ctaVariant}
                onChange={(v) => set({ ctaVariant: v })}
                options={CTA_VARIANT_OPTIONS}
              />
            </label>
            <label>CTA label
              <input value={state.ctaLabel ?? ''} onChange={(e) => set({ ctaLabel: e.target.value })} placeholder="Go Pro" />
            </label>
          </div>
          <div className="pe-toggles">
            <Toggle label="Active" value={state.isActive} onChange={(v) => set({ isActive: v })} />
            <Toggle label="Most picked" value={state.isPopular} onChange={(v) => set({ isPopular: v })} />
            <Toggle label="Free tier" value={state.isFree} onChange={(v) => set({ isFree: v })} />
          </div>
        </div>

        <div className="pe-section">
          <div className="pe-title-row">
            <div className="pe-title">Pricing variants</div>
            <button className="btn btn-secondary btn-sm" onClick={addPricing}><Plus size={12} />Add cadence</button>
          </div>

          {state.pricings.length === 0 && <div className="pe-empty">No pricings yet — add at least one.</div>}

          <div className="pe-pricings">
            {state.pricings.map((p, i) => (
              <div className="pe-pricing-row" key={i}>
                <div className="pe-pricing-grid">
                  <label>Cadence
                    <Select
                      value={p.cadence}
                      onChange={(v) => updatePricing(i, { cadence: v })}
                      options={CADENCE_OPTIONS}
                    />
                  </label>
                  <label>Price ({state.currency})
                    <input type="number" min="0" value={p.price} onChange={(e) => updatePricing(i, { price: e.target.value })} />
                  </label>
                  <label>Original price
                    <input type="number" min="0" value={p.originalPrice} onChange={(e) => updatePricing(i, { originalPrice: e.target.value })} placeholder="optional" />
                  </label>
                  <label>Token count
                    <input type="number" min="0" value={p.tokenCount} onChange={(e) => updatePricing(i, { tokenCount: e.target.value })} />
                  </label>
                  <label>Token period label
                    <input value={p.tokenPeriodLabel} onChange={(e) => updatePricing(i, { tokenPeriodLabel: e.target.value })} placeholder="per month" />
                  </label>
                  <label>Note
                    <input value={p.note} onChange={(e) => updatePricing(i, { note: e.target.value })} placeholder="Renews monthly" />
                  </label>
                </div>
                <div className="pe-pricing-actions">
                  <Toggle label="Active" value={p.isActive} onChange={(v) => updatePricing(i, { isActive: v })} />
                  <button className="pe-icon-btn danger" onClick={() => removePricing(i)} aria-label="Remove pricing">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pe-section">
          <div className="pe-title-row">
            <div className="pe-title">Features</div>
            <button className="btn btn-secondary btn-sm" onClick={addFeature}><Plus size={12} />Add feature</button>
          </div>

          {state.features.length === 0 && <div className="pe-empty">No features yet — add rows for the card and comparison table.</div>}

          <div className="pe-features">
            {state.features.map((f, i) => (
              <div className="pe-feature-row" key={i}>
                <div className="pe-feature-grid">
                  <label>Section key
                    <input value={f.sectionKey} onChange={(e) => updateFeature(i, { sectionKey: e.target.value })} placeholder="tokens-quizzes" />
                  </label>
                  <label>Section label
                    <input value={f.sectionLabel} onChange={(e) => updateFeature(i, { sectionLabel: e.target.value })} placeholder="Tokens & quizzes" />
                  </label>
                  <label className="pe-feature-label">Label
                    <input value={f.label} onChange={(e) => updateFeature(i, { label: e.target.value })} placeholder="Monthly token allowance" />
                  </label>
                  <label>Type
                    <Select
                      value={f.valueType}
                      onChange={(v) => updateFeature(i, { valueType: v })}
                      options={VALUE_TYPE_OPTIONS}
                    />
                  </label>
                  <label>Value
                    <input
                      value={f.value}
                      onChange={(e) => updateFeature(i, { value: e.target.value })}
                      disabled={f.valueType === 'CHECK' || f.valueType === 'CROSS'}
                      placeholder={f.valueType === 'NUMBER' ? '10' : f.valueType === 'TEXT' ? 'Last 5 years' : '—'}
                    />
                  </label>
                  <label>Sort
                    <input type="number" value={f.sortOrder} onChange={(e) => updateFeature(i, { sortOrder: Number(e.target.value) || 0 })} />
                  </label>
                  <label className="pe-feature-entitlement">Entitlement
                    <Select
                      value={f.entitlementKey || ''}
                      onChange={(v) => updateFeature(i, { entitlementKey: v })}
                      options={ENTITLEMENT_OPTIONS}
                      placeholder="None"
                    />
                  </label>
                </div>
                <div className="pe-feature-actions">
                  <Toggle label="Included" value={f.included} onChange={(v) => updateFeature(i, { included: v })} />
                  <Toggle label="On card" value={f.showOnCard} onChange={(v) => updateFeature(i, { showOnCard: v })} />
                  <Toggle label="In compare" value={f.showInCompare} onChange={(v) => updateFeature(i, { showInCompare: v })} />
                  <Toggle label="Coming soon" value={f.isComingSoon} onChange={(v) => updateFeature(i, { isComingSoon: v })} />
                  <button className="pe-icon-btn danger" onClick={() => removeFeature(i)} aria-label="Remove feature">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <label className="pe-toggle">
      <span className={`tog${value ? ' on' : ''}`} onClick={() => onChange(!value)} role="switch" aria-checked={value} />
      <span className="pe-toggle-label">{label}</span>
    </label>
  )
}
