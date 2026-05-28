import { useState } from 'react'
import { Leaf, Rocket, Crown, CircleCheck, CircleX, Check, Plus, ArrowRight } from 'lucide-react'
import './PricingPage.css'

const CADENCES = ['monthly', 'annual', 'onetime']
const CADENCE_LABELS = ['Monthly', 'Annual', 'One-time']

const FAQ_DATA = [
  { q: 'How exactly do tokens work?', a: 'One token equals one quiz attempt. Standard quizzes (20-question sets) cost 1 token; full-length mock tests (90 questions) cost 3 tokens. Tokens reset on your plan\'s renewal date — they don\'t roll over between months. Tokens earned from streak milestones or friend referrals don\'t expire.', defaultOpen: true },
  { q: 'Can I switch plans mid-month?', a: 'Yes. Upgrades take effect immediately and we\'ll prorate the difference. Downgrades take effect at the end of your current billing cycle — you\'ll keep your existing tokens until then.' },
  { q: 'What\'s the difference between annual and one-time?', a: 'Annual is a yearly subscription — billed once a year, renews automatically, slightly cheaper than 12 monthly payments. One-time is a single payment that buys you the tokens upfront and doesn\'t renew. Good if you want to budget exactly once with no recurring charge.' },
  { q: 'Do tokens roll over if I don\'t use them?', a: 'No — monthly allowances reset on your renewal date. Earned tokens (from streaks, referrals, friend duels) are separate and never expire.' },
  { q: 'How do I cancel?', a: 'Settings → Billing → Cancel subscription. You\'ll keep access until the end of the current billing cycle, then drop to Free automatically. No phone calls, no retention dances.' },
  { q: 'Is there a refund or money-back guarantee?', a: 'We don\'t offer refunds — the Free plan exists precisely so you can test the product before paying. If something goes wrong (billing error, technical issue), email support@rankrush.in and we\'ll make it right.' },
  { q: 'Are there referral rewards?', a: 'Yes — refer up to 5 friends and every time one of them buys any paid plan, both of you earn 2 tokens. The referral link lives on the Refer & Earn page; share it via WhatsApp, email, or just copy and paste.' },
]

const PRICES = {
  monthly: { starter: '₹99', starterPer: '/month', pro: '₹299', proPer: '/month', starterNote: 'Renews monthly', proNote: 'Renews monthly', starterTokenLabel: 'per month', proTokenLabel: 'per month' },
  annual: { starter: '₹990', starterPer: '/year', starterStrike: '₹1,188', starterSave: '≈ ₹82.50 / month · 2 months free', pro: '₹2,990', proPer: '/year', proStrike: '₹3,588', proSave: '≈ ₹249 / month · 2 months free', starterTokenLabel: 'per month (120 / year)', proTokenLabel: 'per month (600 / year)' },
  onetime: { starter: '₹149', starterPer: 'one-time', starterNote: 'No subscription · single payment', pro: '₹499', proPer: 'one-time', proNote: 'No subscription · single payment', starterTokenLabel: 'once', proTokenLabel: 'once' },
}

export default function PricingPage() {
  const [cadence, setCadence] = useState('monthly')
  const [openFaq, setOpenFaq] = useState(new Set([0]))

  const p = PRICES[cadence]

  const toggleFaq = (i) => {
    setOpenFaq(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
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
          {CADENCES.map((c, i) => (
            <button key={c} className={cadence === c ? 'on' : ''} onClick={() => setCadence(c)}>
              {CADENCE_LABELS[i]}
              {c === 'annual' && <span className="save">Save 17%</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="plans-grid">

        {/* FREE */}
        <div className="plan-card">
          <div className="top">
            <div>
              <h3><Leaf size={18} />Free</h3>
              <p className="desc">For dipping a toe in. No card needed.</p>
            </div>
            <span className="plan-badge current">Current</span>
          </div>
          <div className="price-row">
            <span className="plan-price">₹0</span>
            <span className="plan-per">forever</span>
          </div>
          <div className="tokens-cadence-note">Renews monthly</div>
          <div className="token-callout">
            <div className="coin">2</div>
            <div className="text">
              <span className="big"><b style={{ fontFamily: 'var(--rr-font-display)', fontWeight: 700 }}>2 tokens</b> per month</span>
              <span className="small">≈ 2 quizzes / month from your wallet</span>
            </div>
          </div>
          <ul className="feats">
            <li className="feat"><CircleCheck size={16} />Full library access — 147 quizzes</li>
            <li className="feat"><CircleCheck size={16} />Live leaderboards &amp; rank bar</li>
            <li className="feat"><CircleCheck size={16} />Streak garden &amp; activity feed</li>
            <li className="feat"><CircleCheck size={16} />Up to 2 study groups</li>
            <li className="feat muted"><CircleX size={16} />No previous-year papers</li>
            <li className="feat muted"><CircleX size={16} />No advanced analytics</li>
          </ul>
          <div className="cta">
            <button className="btn btn-secondary" style={{ width: '100%' }} disabled>You're on this plan</button>
          </div>
        </div>

        {/* STARTER */}
        <div className="plan-card">
          <div className="top">
            <div>
              <h3><Rocket size={18} />Starter</h3>
              <p className="desc">For weekday-warriors building a habit.</p>
            </div>
          </div>
          <div className="price-row">
            <span className="plan-price">{p.starter}</span>
            <span className="plan-per">{p.starterPer}</span>
            {p.starterStrike && <span className="plan-strike">{p.starterStrike}</span>}
          </div>
          {p.starterSave && <div className="plan-save">{p.starterSave}</div>}
          {p.starterNote && !p.starterSave && <div className="tokens-cadence-note">{p.starterNote}</div>}
          <div className="token-callout">
            <div className="coin">10</div>
            <div className="text">
              <span className="big"><b style={{ fontFamily: 'var(--rr-font-display)', fontWeight: 700 }}>10 tokens</b> {p.starterTokenLabel}</span>
              <span className="small">~ 2–3 quizzes / week to keep momentum</span>
            </div>
          </div>
          <ul className="feats">
            <li className="feat"><CircleCheck size={16} />Everything in Free</li>
            <li className="feat"><CircleCheck size={16} />Previous-year papers — last 5 years</li>
            <li className="feat"><CircleCheck size={16} />Weak-topic analytics</li>
            <li className="feat"><CircleCheck size={16} />Up to 5 study groups</li>
            <li className="feat"><CircleCheck size={16} />Quiz-from-friend challenges</li>
          </ul>
          <div className="cta">
            <button className="btn btn-secondary" style={{ width: '100%' }}>Upgrade to Starter</button>
          </div>
        </div>

        {/* PRO */}
        <div className="plan-card featured">
          <div className="top">
            <div>
              <h3><Crown size={18} />Pro</h3>
              <p className="desc">For students who don't want to count tokens.</p>
            </div>
            <span className="plan-badge featured">★ Most picked</span>
          </div>
          <div className="price-row">
            <span className="plan-price">{p.pro}</span>
            <span className="plan-per">{p.proPer}</span>
            {p.proStrike && <span className="plan-strike">{p.proStrike}</span>}
          </div>
          {p.proSave && <div className="plan-save" style={{ color: 'var(--rr-lime-400)' }}>{p.proSave}</div>}
          {p.proNote && !p.proSave && <div className="tokens-cadence-note" style={{ color: '#9D9DA6' }}>{p.proNote}</div>}
          <div className="token-callout">
            <div className="coin" style={{ background: 'var(--rr-lime-400)', color: '#0E0E13' }}>50</div>
            <div className="text">
              <span className="big"><b style={{ fontFamily: 'var(--rr-font-display)', fontWeight: 700 }}>50 tokens</b> {p.proTokenLabel}</span>
              <span className="small">Enough for ~12 quizzes a week — plus mock tests</span>
            </div>
          </div>
          <ul className="feats">
            <li className="feat"><CircleCheck size={16} />Everything in Starter</li>
            <li className="feat"><CircleCheck size={16} />All previous-year papers, every year</li>
            <li className="feat"><CircleCheck size={16} />Advanced analytics — weak topics, time-per-Q, percentile breakdowns</li>
            <li className="feat"><CircleCheck size={16} />Unlimited study groups &amp; challenges</li>
            <li className="feat"><CircleCheck size={16} />Full-length mock tests included (3 tokens each)</li>
            <li className="feat"><CircleCheck size={16} />Priority support &amp; early features</li>
          </ul>
          <div className="cta">
            <button className="btn btn-lime" style={{ width: '100%' }}>Go Pro<ArrowRight size={14} /></button>
          </div>
        </div>

      </div>

      {/* Compare table */}
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
                <th>Free<span className="price-mini">₹0</span></th>
                <th>Starter<span className="price-mini">₹99/mo</span></th>
                <th className="featured">Pro<span className="price-mini">₹299/mo</span></th>
              </tr>
            </thead>
            <tbody>
              <tr className="section-row"><td colSpan="4">Tokens &amp; quizzes</td></tr>
              <tr><td>Monthly token allowance</td><td><b>2</b></td><td><b>10</b></td><td className="featured"><b>50</b></td></tr>
              <tr><td>Quiz library access</td><td><span className="yes"><Check size={14} />147 quizzes</span></td><td><span className="yes"><Check size={14} />All quizzes</span></td><td className="featured"><span className="yes"><Check size={14} />All quizzes</span></td></tr>
              <tr><td>Previous-year papers</td><td><span className="no">—</span></td><td><b>Last 5 years</b></td><td className="featured"><b>All years</b></td></tr>
              <tr><td>Full-length mock tests (3 tokens each)</td><td><span className="no">—</span></td><td><span className="yes"><Check size={14} /></span></td><td className="featured"><span className="yes"><Check size={14} /></span></td></tr>

              <tr className="section-row"><td colSpan="4">Insights</td></tr>
              <tr><td>Live leaderboards &amp; rank bar</td><td><span className="yes"><Check size={14} /></span></td><td><span className="yes"><Check size={14} /></span></td><td className="featured"><span className="yes"><Check size={14} /></span></td></tr>
              <tr><td>Streak garden &amp; daily activity</td><td><span className="yes"><Check size={14} /></span></td><td><span className="yes"><Check size={14} /></span></td><td className="featured"><span className="yes"><Check size={14} /></span></td></tr>
              <tr><td>Topic insights (strong / weak)</td><td><b>Top 3</b></td><td><b>Top 10</b></td><td className="featured"><b>Full breakdown</b></td></tr>
              <tr><td>Time-per-question analytics</td><td><span className="no">—</span></td><td><span className="no">—</span></td><td className="featured"><span className="yes"><Check size={14} /></span></td></tr>
              <tr><td>Percentile by year/section</td><td><span className="no">—</span></td><td><span className="no">—</span></td><td className="featured"><span className="yes"><Check size={14} /></span></td></tr>

              <tr className="section-row"><td colSpan="4">Collaboration</td></tr>
              <tr><td>Study groups</td><td><b>2</b></td><td><b>5</b></td><td className="featured"><b>Unlimited</b></td></tr>
              <tr><td>Quiz-from-friend challenges</td><td><span className="no">—</span></td><td><span className="yes"><Check size={14} /></span></td><td className="featured"><span className="yes"><Check size={14} /></span></td></tr>
              <tr><td>Chat &amp; live duels</td><td><span className="no">Read-only</span></td><td><span className="yes"><Check size={14} /></span></td><td className="featured"><span className="yes"><Check size={14} /></span></td></tr>

              <tr className="section-row"><td colSpan="4">Support</td></tr>
              <tr><td>Email support</td><td><b>72-hour</b></td><td><b>24-hour</b></td><td className="featured"><b>Priority · 4-hour</b></td></tr>
              <tr><td>Early access to new features</td><td><span className="no">—</span></td><td><span className="no">—</span></td><td className="featured"><span className="yes"><Check size={14} /></span></td></tr>
            </tbody>
          </table>
        </div>
      </div>

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
      <div className="cta-strip">
        <h2>Ready to <span className="accent">stop counting tokens?</span></h2>
        <p>Go Pro for ₹299/month. Cancel any time. Your rank thanks you in advance.</p>
        <div className="row">
          <button className="btn btn-lime btn-lg">Go Pro · ₹299/mo<ArrowRight size={14} /></button>
          <button className="btn btn-ghost btn-lg" style={{ color: '#FAFAF7', border: '1px solid rgba(255,255,255,0.15)' }}>Try Starter at ₹99</button>
        </div>
      </div>

    </div>
  )
}
