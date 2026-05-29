import { useEffect, useState } from 'react'
import { Ticket, Check, X, Loader2, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../ui/Modal'
import { paymentsAPI } from '../../services/api'
import './RedeemCodeModal.css'

const CADENCE_LABELS = { MONTHLY: 'Monthly', ANNUAL: 'Annual', ONE_TIME: 'One-time' }

function formatCurrency(amount, currency = 'INR') {
  if (amount == null) return '—'
  if (amount === 0) return '₹0'
  const symbol = currency === 'INR' ? '₹' : currency + ' '
  return `${symbol}${Math.round(amount).toLocaleString('en-IN')}`
}

// Props: open, plan, pricing, cadence, onClose, onProceed(redeemCode | null)
export default function RedeemCodeModal({ open, plan, pricing, cadence, onClose, onProceed }) {
  const [code, setCode] = useState('')
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(null) // { code, discountPercentage, discountedPrice, originalPrice }
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setCode('')
      setApplied(null)
      setError('')
      setApplying(false)
    }
  }, [open, plan?.id])

  if (!plan || !pricing) return null

  const finalPrice = applied?.discountedPrice ?? pricing.price
  const currency = plan.currency || 'INR'

  const handleApply = async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      setError('Enter a code first')
      return
    }
    setApplying(true)
    setError('')
    try {
      const res = await paymentsAPI.validateCode({
        code: trimmed,
        planId: plan.id,
        cadence,
      })
      const data = res?.data ?? res
      setApplied({
        code: data.code,
        discountPercentage: data.discountPercentage,
        discountedPrice: data.discountedPrice,
        originalPrice: data.originalPrice,
      })
      toast.success(`${data.discountPercentage}% off applied`)
    } catch (err) {
      setError(err?.message || 'Invalid code')
      setApplied(null)
    } finally {
      setApplying(false)
    }
  }

  const handleRemove = () => {
    setApplied(null)
    setCode('')
    setError('')
  }

  const handleProceed = () => {
    onProceed(applied?.code || null)
  }

  const handleSkip = () => {
    onProceed(null)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Checkout · ${plan.name}`}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={handleSkip}>
            Skip
          </button>
          <button className="btn btn-lime btn-lg rc-pay-btn" onClick={handleProceed}>
            Pay {formatCurrency(finalPrice, currency)} <ArrowRight size={14} />
          </button>
        </div>
      }
    >
      <div className="rc-modal">
        <div className="rc-plan-row">
          <div>
            <span className="rc-eyebrow">{CADENCE_LABELS[cadence] || cadence}</span>
            <h4>{plan.name}</h4>
            <p className="rc-desc">{plan.description}</p>
          </div>
          <div className="rc-price-block">
            {applied && applied.originalPrice != null && applied.originalPrice !== applied.discountedPrice && (
              <span className="rc-price-strike">{formatCurrency(applied.originalPrice, currency)}</span>
            )}
            <span className="rc-price">{formatCurrency(finalPrice, currency)}</span>
            <span className="rc-price-sub">
              {cadence === 'MONTHLY' ? 'per month' : cadence === 'ANNUAL' ? 'per year' : 'one-time'}
            </span>
          </div>
        </div>

        <div className="rc-divider" />

        <div className="rc-section">
          <div className="rc-section-head">
            <Ticket size={14} />
            <span>Have a redeem code?</span>
          </div>

          {applied ? (
            <div className="rc-applied">
              <span className="rc-chip">
                <Check size={12} />
                {applied.code}
                <span className="rc-chip-pct">{applied.discountPercentage}% off</span>
                <button type="button" className="rc-chip-x" onClick={handleRemove} aria-label="Remove code">
                  <X size={11} />
                </button>
              </span>
              <span className="rc-applied-msg">
                Saved {formatCurrency((applied.originalPrice || 0) - (applied.discountedPrice || 0), currency)} · final {formatCurrency(applied.discountedPrice, currency)}
              </span>
            </div>
          ) : (
            <div className="rc-input-row">
              <input
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApply() } }}
                placeholder="e.g. LAUNCH95"
                className="rc-input"
                spellCheck={false}
                autoFocus
                disabled={applying}
              />
              <button
                type="button"
                className="btn btn-accent btn-sm rc-apply-btn"
                onClick={handleApply}
                disabled={applying || !code.trim()}
              >
                {applying ? <Loader2 size={14} className="rc-spin" /> : 'Apply'}
              </button>
            </div>
          )}

          {error && <div className="rc-error">{error}</div>}
        </div>

        <div className="rc-summary">
          <div className="rc-summary-row">
            <span>Plan price</span>
            <span>{formatCurrency(pricing.price, currency)}</span>
          </div>
          {applied && (
            <div className="rc-summary-row rc-summary-discount">
              <span>Discount ({applied.discountPercentage}%)</span>
              <span>− {formatCurrency((applied.originalPrice || pricing.price) - (applied.discountedPrice || 0), currency)}</span>
            </div>
          )}
          <div className="rc-summary-row rc-summary-total">
            <span>Total</span>
            <span><b>{formatCurrency(finalPrice, currency)}</b></span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
