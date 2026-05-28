import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Copy, Check, MessageCircle, Share2, Mail, Send,
  CircleCheck, UserPlus, Zap, Plus, Loader2,
} from 'lucide-react'
import { tokensAPI } from '../../services/api'
import './ReferPage.css'

const TABS = ['All', 'Pending', 'Converted']
const CONVERSION_CAP = 5
const TOKENS_PER_CONVERSION = 2

function buildShareMessage(link) {
  return `Hey! Take a look at RankRush — quiz-based exam prep that's actually fun. Use my link and we each get 2 free tokens on your first paid plan: ${link}`
}

function safeCopy(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  }
  // Fallback for non-secure contexts (older Safari / http)
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      ok ? resolve() : reject(new Error('copy failed'))
    } catch (e) { reject(e) }
  })
}

export default function ReferPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    let cancelled = false
    tokensAPI.getReferrals()
      .then((res) => {
        if (cancelled) return
        setData(res?.data ?? res ?? null)
      })
      .catch((err) => {
        if (cancelled) return
        toast.error(err?.message || 'Failed to load referral info')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const referralCode = data?.referralCode || ''
  const successfulReferrals = data?.successfulReferrals ?? 0
  const tokensEarned = data?.tokensEarned ?? 0
  const history = data?.history ?? []

  const shareUrl = useMemo(() => {
    if (!referralCode) return ''
    return `${window.location.origin}/signup?rid=${encodeURIComponent(referralCode)}`
  }, [referralCode])

  const remainingConversions = Math.max(0, CONVERSION_CAP - successfulReferrals)
  const remainingTokens = remainingConversions * TOKENS_PER_CONVERSION

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      await safeCopy(shareUrl)
      setCopied(true)
      toast.success('Link copied')
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error("Couldn't copy — long-press the link to copy manually")
    }
  }

  const handleNativeShare = async () => {
    if (!shareUrl) return
    const message = buildShareMessage(shareUrl)
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join me on RankRush', text: message, url: shareUrl })
      } catch (err) {
        if (err?.name !== 'AbortError') {
          await safeCopy(message).then(() => toast.success('Share text copied to clipboard')).catch(() => {})
        }
      }
    } else {
      await safeCopy(message).then(() => toast.success('Share text copied to clipboard')).catch(() => toast.error('Share unavailable'))
    }
  }

  const openWhatsApp = () => {
    if (!shareUrl) return
    const text = encodeURIComponent(buildShareMessage(shareUrl))
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  const openTwitter = () => {
    if (!shareUrl) return
    const text = encodeURIComponent(`Quiz-based exam prep that's actually fun. Use my link for 2 free tokens:`)
    const url = encodeURIComponent(shareUrl)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer')
  }

  const openEmail = () => {
    if (!shareUrl) return
    const subject = encodeURIComponent('Join me on RankRush')
    const body = encodeURIComponent(buildShareMessage(shareUrl))
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  // Filter history for the tabs
  const filteredHistory = useMemo(() => {
    if (activeTab === 1) return history.filter((h) => h.status !== 'SUCCESS')
    if (activeTab === 2) return history.filter((h) => h.status === 'SUCCESS')
    return history
  }, [history, activeTab])

  return (
    <div className="main">

      <div className="page-head">
        <div className="crumb">/ Account / Refer &amp; Earn</div>
      </div>

      <div className="refer-hero">
        <span className="eyebrow">Refer &amp; Earn</span>
        <h1>Bring a friend. <em>Both of you get 2 tokens.</em></h1>
        <p className="sub">
          When a friend you refer signs up <b>and</b> buys any paid plan, we credit <b>2 tokens to you</b> and <b>2 tokens to them</b> — instantly. Cap is {CONVERSION_CAP} conversions, so {CONVERSION_CAP * TOKENS_PER_CONVERSION} tokens total free for the taking.
        </p>

        <div className="reward-visual">
          <div className="rv-side">
            <span className="lbl">They get</span>
            <div className="big">
              <div className="coin">{TOKENS_PER_CONVERSION}</div>
              <div className="text">{TOKENS_PER_CONVERSION} tokens<small>added to their wallet</small></div>
            </div>
          </div>
          <span className="rv-eq">+</span>
          <div className="rv-side">
            <span className="lbl">You get</span>
            <div className="big">
              <div className="coin">{TOKENS_PER_CONVERSION}</div>
              <div className="text">{TOKENS_PER_CONVERSION} tokens<small>added to your wallet</small></div>
            </div>
          </div>
        </div>

        <div className="code-section">
          <div className="code-left">
            <span className="code-meta">
              Your referral link · <b>{successfulReferrals} of {CONVERSION_CAP}</b> conversions so far
            </span>
            <div className="code-row">
              <div className="code-input" title={shareUrl}>
                {loading
                  ? 'Loading…'
                  : referralCode
                    ? <>rankrush.in/signup?rid=<b>{referralCode}</b></>
                    : 'Code unavailable'}
              </div>
              <button className={`btn-copy${copied ? ' copied' : ''}`} onClick={handleCopy} disabled={!shareUrl || loading}>
                {copied ? <><Check size={16} />Copied</> : <><Copy size={16} />Copy link</>}
              </button>
            </div>
          </div>
          <div className="share-cluster">
            <button type="button" className="share-btn wa" title="Share to WhatsApp" onClick={openWhatsApp} disabled={!shareUrl}>
              <MessageCircle size={18} />
            </button>
            <button type="button" className="share-btn tw" title="Share to X (Twitter)" onClick={openTwitter} disabled={!shareUrl}>
              <Send size={18} />
            </button>
            <button type="button" className="share-btn" title="Native share" onClick={handleNativeShare} disabled={!shareUrl}>
              <Share2 size={18} />
            </button>
            <button type="button" className="share-btn" title="Email" onClick={openEmail} disabled={!shareUrl}>
              <Mail size={18} />
            </button>
          </div>
        </div>

        <div className="progress-strip">
          <div className="ps-num">
            +{tokensEarned}<small> tokens earned</small>
          </div>
          <div>
            <div className="ps-meta">Conversions · {successfulReferrals} of {CONVERSION_CAP}</div>
            <div className="ps-cap">
              {remainingConversions > 0
                ? <><b>{remainingConversions} more conversion{remainingConversions === 1 ? '' : 's'}</b> · up to <b>+{remainingTokens} tokens</b> waiting</>
                : <b>Cap reached — nice work.</b>}
            </div>
          </div>
          <div className="ps-slots">
            {Array.from({ length: CONVERSION_CAP }).map((_, i) => {
              const isDone = i < successfulReferrals
              const isNext = i === successfulReferrals && successfulReferrals < CONVERSION_CAP
              return (
                <div key={i} className={`slot${isDone ? ' done' : isNext ? ' pending' : ''}`}>{i + 1}</div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="section-head">
        <h2>How it works</h2>
        <span className="sub">Three steps. Both of you win.</span>
      </div>
      <div className="steps">
        <div className="step-card">
          <div className="stepnum">01</div>
          <h4>Share your link</h4>
          <p>Copy your unique link and send it to a friend via WhatsApp, email, or a paste in your class group.</p>
        </div>
        <div className="step-card">
          <div className="stepnum">02</div>
          <h4>They sign up &amp; subscribe</h4>
          <p>Your friend creates an account using your link and buys any paid plan — Starter or Pro.</p>
        </div>
        <div className="step-card">
          <div className="stepnum">03</div>
          <h4>Both wallets&nbsp;<span className="reward-pill"><Zap size={11} />+{TOKENS_PER_CONVERSION} tokens</span></h4>
          <p>The moment payment clears, {TOKENS_PER_CONVERSION} tokens land in your wallet and {TOKENS_PER_CONVERSION} land in theirs. Capped at {CONVERSION_CAP} conversions.</p>
        </div>
      </div>

      <div className="friends-card" style={{ marginTop: 32 }}>
        <div className="friends-head">
          <div>
            <h2>Friends you've referred</h2>
            <span className="sub">
              {successfulReferrals} of {CONVERSION_CAP} converted
              {history.length > successfulReferrals && ` · ${history.length - successfulReferrals} signed up but not subscribed yet`}
            </span>
          </div>
          <div className="right">
            <div className="tabs-mini">
              {TABS.map((t, i) => (
                <button key={t} className={activeTab === i ? 'on' : ''} onClick={() => setActiveTab(i)}>{t}</button>
              ))}
            </div>
            <button className="btn btn-accent btn-sm" onClick={handleNativeShare} disabled={!shareUrl}>
              <Plus size={14} />Invite another
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '48px 24px', display: 'flex', justifyContent: 'center', color: 'var(--rr-fg-muted)' }}>
            <Loader2 size={20} className="spin" />
          </div>
        ) : filteredHistory.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--rr-fg-muted)', fontSize: 13 }}>
            {activeTab === 0
              ? "No referrals yet. Share your link to start earning."
              : activeTab === 1
                ? "No pending referrals."
                : "No conversions yet."}
          </div>
        ) : (
          <table className="friends-table">
            <thead>
              <tr>
                <th>Friend</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Tokens</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((ref, i) => {
                const isSuccess = ref.status === 'SUCCESS'
                const StatusIcon = isSuccess ? CircleCheck : UserPlus
                const label = isSuccess ? 'Bought paid plan' : 'Signed up'
                const statusClass = isSuccess ? 'upgraded' : 'signed'
                const tokens = isSuccess ? `+${TOKENS_PER_CONVERSION}` : 'Pending'
                const tokensClass = isSuccess ? 'earned' : 'pending'
                const initial = ref.referredId ? ref.referredId.slice(-2, -1).toUpperCase() : '?'
                const color = ['var(--rr-amber-500)', 'var(--rr-violet-500)', 'var(--rr-cyan-500)', 'var(--rr-coral-400)', 'var(--rr-emerald-500)'][i % 5]
                return (
                  <tr key={ref.id || i}>
                    <td>
                      <div className="friend-cell">
                        <div className="av" style={{ background: color }}>{initial}</div>
                        <div>
                          <span className="nm">Friend #{history.length - i}</span>
                          <span className="id">{ref.referredId ? `id ${ref.referredId.slice(-6)}` : '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className={`f-status ${statusClass}`}><StatusIcon size={11} />{label}</span></td>
                    <td><span className="date">{new Date(ref.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></td>
                    <td><span className={`tokens ${tokensClass}`}>{tokens}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <div className="friends-foot">
          <span>
            <b>+{tokensEarned} tokens</b> earned · <b>{remainingConversions} slot{remainingConversions === 1 ? '' : 's'}</b> left
            {remainingConversions > 0 && <> · up to <b>+{remainingTokens} more tokens</b> possible</>}
          </span>
          <Link to="/app/tokens" style={{ color: 'var(--rr-violet-500)', fontWeight: 500 }}>View token history →</Link>
        </div>
      </div>

      <div className="refer-faq">
        <h3>Quick FAQ</h3>
        <dl>
          <div>
            <dt>How many friends can I refer?</dt>
            <dd>Up to <b>{CONVERSION_CAP} conversions</b>. You can <em>invite</em> as many people as you want — the cap is on paid conversions.</dd>
          </div>
          <div>
            <dt>When exactly do tokens arrive?</dt>
            <dd>The moment your friend's payment for any paid plan clears. Usually within a minute. We'll send you a notification when it happens.</dd>
          </div>
          <div>
            <dt>What if my friend pays but cancels later?</dt>
            <dd>Tokens you've already earned are yours to keep. They cancel their plan, you keep the {TOKENS_PER_CONVERSION} tokens. Their refund (if any) is between them and our billing partner.</dd>
          </div>
          <div>
            <dt>Do tokens earned here expire?</dt>
            <dd>No. Referral tokens never expire — they live in your wallet until you spend them. Plan-allowance tokens are the ones that reset monthly; these are separate.</dd>
          </div>
        </dl>
      </div>

    </div>
  )
}
