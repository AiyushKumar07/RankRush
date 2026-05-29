import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Leaf, Rocket, Crown, Sparkles, Star, Zap, Gem, Shield,
  CircleCheck, CircleX, Check, Plus, ArrowRight,
} from 'lucide-react'
import { paymentsAPI, subscriptionPlansAPI } from '../../services/api'
import { useEntitlements } from '../../hooks/useEntitlements'
import { useAuth } from '../../context/AuthContext'
import RedeemCodeModal from '../../components/student/RedeemCodeModal'
import './PricingPage.css'

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js'

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window.Razorpay !== 'undefined') return resolve(true)
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(true))
      existing.addEventListener('error', () => resolve(false))
      return
    }
    const script = document.createElement('script')
    script.src = RAZORPAY_SCRIPT
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

const CADENCES = ['MONTHLY', 'ANNUAL', 'ONE_TIME']
const CADENCE_LABELS = { MONTHLY: 'Monthly', ANNUAL: 'Annual', ONE_TIME: 'One-time' }

const ICON_MAP = {
  leaf: Leaf,
  rocket: Rocket,
  crown: Crown,
  sparkles: Sparkles,
  star: Star,
  zap: Zap,
  gem: Gem,
  shield: Shield,
}

const FAQ_DATA = [
  { q: 'How exactly do tokens work?', a: 'One token equals one quiz attempt. Standard quizzes (20-question sets) cost 1 token; full-length mock tests (90 questions) cost 3 tokens. Tokens reset on your plan\'s renewal date — they don\'t roll over between months. Tokens earned from streak milestones or friend referrals don\'t expire.', defaultOpen: true },
  { q: 'Can I switch plans mid-month?', a: 'Yes. Upgrades take effect immediately and we\'ll prorate the difference. Downgrades take effect at the end of your current billing cycle — you\'ll keep your existing tokens until then.' },
  { q: 'What\'s the difference between annual and one-time?', a: 'Annual is a yearly subscription — billed once a year, renews automatically, slightly cheaper than 12 monthly payments. One-time is a single payment that buys you the tokens upfront and doesn\'t renew. Good if you want to budget exactly once with no recurring charge.' },
  { q: 'Do tokens roll over if I don\'t use them?', a: 'No — monthly allowances reset on your renewal date. Earned tokens (from streaks, referrals, friend duels) are separate and never expire.' },
  { q: 'How do I cancel?', a: 'Settings → Billing → Cancel subscription. You\'ll keep access until the end of the current billing cycle, then drop to Free automatically. No phone calls, no retention dances.' },
  { q: 'Is there a refund or money-back guarantee?', a: 'We don\'t offer refunds — the Free plan exists precisely so you can test the product before paying. If something goes wrong (billing error, technical issue), email support@rankrush.in and we\'ll make it right.' },
  { q: 'Are there referral rewards?', a: 'Yes — refer up to 5 friends and every time one of them buys any paid plan, both of you earn 2 tokens. The referral link lives on the Refer & Earn page; share it via WhatsApp, email, or just copy and paste.' },
]

function formatCurrency(amount, currency = 'INR') {
  if (amount == null) return ''
  if (amount === 0) return '₹0'
  const symbol = currency === 'INR' ? '₹' : currency + ' '
  return `${symbol}${Math.round(amount).toLocaleString('en-IN')}`
}

function getPlanIcon(key) {
  const Comp = ICON_MAP[(key || '').toLowerCase()]
  return Comp || Leaf
}

function pickPricing(plan, cadence) {
  if (!plan?.pricings?.length) return null
  return (
    plan.pricings.find((p) => p.cadence === cadence) ||
    plan.pricings.find((p) => p.cadence === 'MONTHLY') ||
    plan.pricings[0]
  )
}

function renderFeatureValue(feature) {
  switch (feature.valueType) {
    case 'CHECK':
      return <span className="yes"><Check size={14} /></span>
    case 'CROSS':
      return <span className="no">—</span>
    case 'TEXT':
    case 'NUMBER':
      return <b>{feature.value || '—'}</b>
    default:
      return <span className="no">—</span>
  }
}

export default function PricingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { refresh: refreshEntitlements, planName } = useEntitlements()

  const [cadence, setCadence] = useState('MONTHLY')
  const [openFaq, setOpenFaq] = useState(new Set([0]))
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [buying, setBuying] = useState(null) // planId currently being purchased
  const [redeemModal, setRedeemModal] = useState(null) // { plan, pricing } | null

  const handleBuy = (plan) => {
    if (!plan?.id || plan.isFree) return
    if (!user) {
      toast.error('Please log in to upgrade')
      navigate('/login')
      return
    }
    const pricing = pickPricing(plan, cadence)
    if (!pricing) {
      toast.error('This cadence is unavailable for the selected plan')
      return
    }
    // Show the redeem-code modal first; checkout happens from onProceed.
    setRedeemModal({ plan, pricing })
  }

  const performCheckout = async (plan, redeemCode) => {
    setRedeemModal(null)
    setBuying(plan.id)
    const t = toast.loading('Opening checkout…')
    try {
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        toast.error('Failed to load Razorpay. Check your connection.', { id: t })
        return
      }

      const orderRes = await paymentsAPI.createOrder({
        planId: plan.id,
        cadence,
        ...(redeemCode ? { redeemCode } : {}),
      })
      const order = orderRes?.data ?? orderRes
      if (!order?.orderId || !order?.keyId) {
        toast.error('Could not create order. Try again.', { id: t })
        return
      }
      toast.dismiss(t)

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'RankRush',
        description: `${plan.name} · ${CADENCE_LABELS[cadence] || cadence}`,
        prefill: {
          name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.email,
        },
        theme: { color: '#0E0E13' },
        handler: async (response) => {
          const v = toast.loading('Verifying payment…')
          try {
            await paymentsAPI.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            await refreshEntitlements()
            toast.success(`You're on ${plan.name}. Tokens credited.`, { id: v })
            navigate('/app/billing')
          } catch (err) {
            toast.error(err?.message || 'Payment verification failed', { id: v })
          } finally {
            setBuying(null)
          }
        },
        modal: {
          ondismiss: () => {
            setBuying(null)
            toast.dismiss(t)
          },
        },
      })
      checkout.on('payment.failed', (resp) => {
        toast.error(resp?.error?.description || 'Payment failed')
        setBuying(null)
      })
      checkout.open()
    } catch (err) {
      toast.error(err?.message || 'Could not start checkout', { id: t })
      setBuying(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    subscriptionPlansAPI.list()
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res) ? res : (res?.data ?? [])
        setPlans(list)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || 'Failed to load plans')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const compareData = useMemo(() => buildCompareTable(plans), [plans])

  const toggleFaq = (i) => {
    setOpenFaq((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="main">

      <div className="pricing-hero">
        <div className="crumb">/ Account / Pricing</div>
        <h1>Pick your <span className="accent">pace.</span></h1>
        <p>One token equals one quiz attempt. Pick the plan that matches how often you want to climb — switch anytime, no questions asked.</p>
      </div>

      <div className="cadence-wrap">
        <div className="cadence" role="tablist">
          {CADENCES.map((c) => (
            <button key={c} className={cadence === c ? 'on' : ''} onClick={() => setCadence(c)}>
              {CADENCE_LABELS[c]}
              {c === 'ANNUAL' && <span className="save">Save 17%</span>}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="plans-grid">
          {[0, 1, 2].map((i) => <div key={i} className="plan-card skeleton" />)}
        </div>
      )}

      {error && !loading && (
        <div className="plans-error">Couldn't load plans — {error}.</div>
      )}

      {!loading && !error && (
        <div className="plans-grid">
          {plans.map((plan) => (
            <PlanCardView
              key={plan.id}
              plan={plan}
              cadence={cadence}
              currentPlanName={planName}
              isBuying={buying === plan.id}
              isAnyBuying={!!buying}
              onBuy={() => handleBuy(plan)}
            />
          ))}
        </div>
      )}

      {/* Compare table */}
      {!loading && !error && plans.length > 0 && compareData.sections.length > 0 && (
        <div className="compare-section">
          <div className="compare-head">
            <h2>Compare plans, line by line.</h2>
            <p>The full feature breakdown. Question marks live in the FAQ below.</p>
          </div>

          <div className="compare-table">
            <table>
              <thead>
                <tr>
                  <th>Feature</th>
                  {plans.map((plan) => {
                    const pricing = pickPricing(plan, cadence) || pickPricing(plan, 'MONTHLY')
                    const priceLabel = plan.isFree
                      ? '₹0'
                      : pricing
                        ? `${formatCurrency(pricing.price, plan.currency)}${pricing.tokenPeriodLabel ? '' : ''}${pricing.cadence === 'MONTHLY' ? '/mo' : pricing.cadence === 'ANNUAL' ? '/yr' : ''}`
                        : ''
                    return (
                      <th key={plan.id} className={plan.isPopular ? 'featured' : undefined}>
                        {plan.name}
                        <span className="price-mini">{priceLabel}</span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {compareData.sections.map((section) => (
                  <FragmentSection
                    key={section.key}
                    section={section}
                    plans={plans}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="faq-section">
        <h2>Anything else?</h2>
        {FAQ_DATA.map((item, i) => (
          <div key={i} className={`faq${openFaq.has(i) ? ' open' : ''}`}>
            <button className="faq-summary" onClick={() => toggleFaq(i)}>
              {item.q} <Plus size={18} />
            </button>
            {openFaq.has(i) && (
              <div className="faq-body">{item.a}</div>
            )}
          </div>
        ))}
      </div>

      {/* CTA strip */}
      {!loading && !error && (() => {
        const featured = plans.find((p) => p.isPopular) || plans[plans.length - 1]
        const featuredPricing = featured ? pickPricing(featured, cadence) : null
        const starter = plans.find((p) => !p.isFree && !p.isPopular) || null
        const starterPricing = starter ? pickPricing(starter, cadence) : null
        if (!featured) return null
        return (
          <div className="cta-strip">
            <h2>Ready to <span className="accent">stop counting tokens?</span></h2>
            <p>
              Go {featured.name} for {featuredPricing ? formatCurrency(featuredPricing.price, featured.currency) : ''}
              {featuredPricing?.cadence === 'MONTHLY' ? '/month' : featuredPricing?.cadence === 'ANNUAL' ? '/year' : ''}.
              Cancel any time. Your rank thanks you in advance.
            </p>
            <div className="row">
              <button
                className="btn btn-lime btn-lg"
                onClick={() => handleBuy(featured)}
                disabled={!!buying}
              >
                {buying === featured.id ? 'Opening checkout…' : (featured.ctaLabel || `Go ${featured.name}`)}
                {featuredPricing && buying !== featured.id && ` · ${formatCurrency(featuredPricing.price, featured.currency)}${featuredPricing.cadence === 'MONTHLY' ? '/mo' : featuredPricing.cadence === 'ANNUAL' ? '/yr' : ''}`}
                <ArrowRight size={14} />
              </button>
              {starter && starterPricing && (
                <button
                  className="btn btn-ghost btn-lg"
                  style={{ color: '#FAFAF7', border: '1px solid rgba(255,255,255,0.15)' }}
                  onClick={() => handleBuy(starter)}
                  disabled={!!buying}
                >
                  {buying === starter.id ? 'Opening checkout…' : `Try ${starter.name} at ${formatCurrency(starterPricing.price, starter.currency)}`}
                </button>
              )}
            </div>
          </div>
        )
      })()}

      <RedeemCodeModal
        open={!!redeemModal}
        plan={redeemModal?.plan ?? null}
        pricing={redeemModal?.pricing ?? null}
        cadence={cadence}
        onClose={() => setRedeemModal(null)}
        onProceed={(redeemCode) => {
          if (!redeemModal?.plan) return
          performCheckout(redeemModal.plan, redeemCode)
        }}
      />

    </div>
  )
}

function PlanCardView({ plan, cadence, currentPlanName, isBuying, isAnyBuying, onBuy }) {
  const Icon = getPlanIcon(plan.icon)
  const pricing = pickPricing(plan, cadence)
  const cardFeatures = (plan.features || []).filter((f) => f.showOnCard)
  const isPopular = plan.isPopular
  const isFree = plan.isFree
  const isCurrent = !!(currentPlanName && plan.name && currentPlanName.toLowerCase() === plan.name.toLowerCase())
  const buttonDisabled = isCurrent || isFree || isAnyBuying
  const buttonLabel = isBuying
    ? 'Opening checkout…'
    : isCurrent
      ? "You're on this plan"
      : isFree
        ? 'Free tier'
        : (plan.ctaLabel || `Choose ${plan.name}`)

  // "Current" badge is UI-derived from the live subscription. Other badges
  // (e.g. "Most picked") are static marketing labels from the seed.
  const showCurrentBadge = isCurrent
  const staticBadge = !isCurrent && plan.badge ? plan.badge : null

  return (
    <div className={`plan-card${isPopular ? ' featured' : ''}`}>
      <div className="top">
        <div>
          <h3><Icon size={18} />{plan.name}</h3>
          <p className="desc">{plan.description}</p>
        </div>
        {showCurrentBadge ? (
          <span className="plan-badge current">Current</span>
        ) : staticBadge ? (
          <span className={`plan-badge ${isPopular ? 'featured' : 'current'}`}>
            {isPopular ? '★ ' : ''}{staticBadge}
          </span>
        ) : null}
      </div>

      <div className="price-row">
        <span className="plan-price">{formatCurrency(pricing?.price ?? 0, plan.currency)}</span>
        {pricing && (
          <span className="plan-per">
            {pricing.cadence === 'MONTHLY' ? '/month'
              : pricing.cadence === 'ANNUAL' ? '/year'
              : isFree ? 'forever'
              : 'one-time'}
          </span>
        )}
        {pricing?.originalPrice && pricing.originalPrice > pricing.price && (
          <span className="plan-strike">{formatCurrency(pricing.originalPrice, plan.currency)}</span>
        )}
      </div>

      {pricing?.note && (
        pricing.originalPrice
          ? <div className="plan-save" style={isPopular ? { color: 'var(--rr-lime-400)' } : undefined}>{pricing.note}</div>
          : <div className="tokens-cadence-note" style={isPopular ? { color: '#9D9DA6' } : undefined}>{pricing.note}</div>
      )}

      {pricing && (
        <div className="token-callout">
          <div
            className="coin"
            style={isPopular ? { background: 'var(--rr-lime-400)', color: '#0E0E13' } : undefined}
          >
            {pricing.tokenCount}
          </div>
          <div className="text">
            <span className="big">
              <b style={{ fontFamily: 'var(--rr-font-display)', fontWeight: 700 }}>
                {pricing.tokenCount} tokens
              </b>{' '}
              {pricing.tokenPeriodLabel}
            </span>
            {plan.description && <span className="small">{plan.description}</span>}
          </div>
        </div>
      )}

      <ul className="feats">
        {cardFeatures.map((f) => (
          <li key={f.id} className={`feat${f.included ? '' : ' muted'}`}>
            {f.included
              ? <CircleCheck size={16} />
              : <CircleX size={16} />}
            <span>
              {f.valueType === 'TEXT' || f.valueType === 'NUMBER'
                ? `${f.label}${f.value ? ` — ${f.value}` : ''}`
                : f.label}
              {f.isComingSoon && <span className="coming-soon-chip">Coming soon</span>}
            </span>
          </li>
        ))}
      </ul>

      <div className="cta">
        <button
          className={`btn btn-${plan.ctaVariant || (isPopular ? 'lime' : 'secondary')}`}
          style={{ width: '100%' }}
          disabled={buttonDisabled}
          onClick={onBuy}
        >
          {buttonLabel}
          {!buttonDisabled && isPopular && <ArrowRight size={14} />}
        </button>
      </div>
    </div>
  )
}

function FragmentSection({ section, plans }) {
  return (
    <>
      <tr className="section-row"><td colSpan={1 + plans.length}>{section.label}</td></tr>
      {section.rows.map((row) => (
        <tr key={row.label}>
          <td>
            <span className="row-label">
              {row.label}
              {row.isComingSoon && <span className="coming-soon-chip">Coming soon</span>}
            </span>
          </td>
          {plans.map((plan) => {
            const feature = (plan.features || []).find(
              (f) => f.label === row.label && f.sectionKey === section.key && f.showInCompare,
            )
            return (
              <td key={plan.id} className={plan.isPopular ? 'featured' : undefined}>
                {feature ? renderFeatureValue(feature) : <span className="no">—</span>}
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}

function buildCompareTable(plans) {
  // Build an ordered list of sections (by sortOrder of the first feature in each section
  // across all plans), and within each section an ordered list of unique feature labels.
  const sectionOrder = new Map() // key -> { key, label, firstSort }
  const labelsBySection = new Map() // key -> Map(label -> { sort, isComingSoon })

  for (const plan of plans) {
    for (const f of plan.features || []) {
      if (!f.showInCompare) continue
      if (!sectionOrder.has(f.sectionKey)) {
        sectionOrder.set(f.sectionKey, {
          key: f.sectionKey,
          label: f.sectionLabel,
          firstSort: f.sortOrder ?? 0,
        })
      }
      const entry = sectionOrder.get(f.sectionKey)
      if ((f.sortOrder ?? 0) < entry.firstSort) entry.firstSort = f.sortOrder ?? 0

      if (!labelsBySection.has(f.sectionKey)) labelsBySection.set(f.sectionKey, new Map())
      const labels = labelsBySection.get(f.sectionKey)
      const prev = labels.get(f.label)
      if (!prev) {
        labels.set(f.label, { sort: f.sortOrder ?? 0, isComingSoon: !!f.isComingSoon })
      } else {
        if ((f.sortOrder ?? 0) < prev.sort) prev.sort = f.sortOrder ?? 0
        if (f.isComingSoon) prev.isComingSoon = true
      }
    }
  }

  const sections = [...sectionOrder.values()]
    .sort((a, b) => a.firstSort - b.firstSort)
    .map((s) => ({
      key: s.key,
      label: s.label,
      rows: [...(labelsBySection.get(s.key) || new Map()).entries()]
        .sort((a, b) => a[1].sort - b[1].sort)
        .map(([label, meta]) => ({ label, isComingSoon: meta.isComingSoon })),
    }))

  return { sections }
}
