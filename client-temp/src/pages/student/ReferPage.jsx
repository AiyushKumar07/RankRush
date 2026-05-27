import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Check, MessageCircle, Share2, Mail, CircleCheck, UserPlus, Zap, Plus } from 'lucide-react'
import './ReferPage.css'

const FRIENDS = [
  { name: 'Aanya Gupta', email: 'aanya.g@gmail.com', initial: 'A', color: 'var(--rr-amber-500)', status: 'upgraded', statusLabel: 'Bought Pro', statusIcon: CircleCheck, date: '8 May 2026', tokens: '+2', tokensClass: 'earned' },
  { name: 'Tanvi Sharma', email: 'tanvi.s@gmail.com', initial: 'T', color: 'var(--rr-violet-500)', status: 'upgraded', statusLabel: 'Bought Starter', statusIcon: CircleCheck, date: '23 May 2026', tokens: '+2', tokensClass: 'earned' },
  { name: 'Rohan Mehra', email: 'rohan.m@gmail.com', initial: 'R', color: 'var(--rr-cyan-500)', status: 'signed', statusLabel: 'Signed up', statusIcon: UserPlus, date: '25 May 2026', tokens: 'Pending', tokensClass: 'pending' },
  { name: 'Karthik V.', email: 'karthik.v@gmail.com', initial: 'K', color: 'var(--rr-coral-400)', status: 'invited', statusLabel: 'Invite sent', statusIcon: Mail, date: '26 May 2026', tokens: '—', tokensClass: 'pending' },
]

const TABS = ['All', 'Pending', 'Converted']

export default function ReferPage() {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  const handleCopy = () => {
    navigator.clipboard?.writeText('rankrush.in/r/astitva-rt7k')
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="main">

      <div className="page-head">
        <div className="crumb">/ Account / Refer &amp; Earn</div>
      </div>

      <div className="refer-hero">
        <span className="eyebrow">Refer &amp; Earn</span>
        <h1>Bring a friend. <em>Both of you get 2 tokens.</em></h1>
        <p className="sub">When a friend you refer signs up <b style={{ color: 'var(--rr-paper)' }}>and</b> buys any paid plan, we credit <b style={{ color: 'var(--rr-paper)' }}>2 tokens to you</b> and <b style={{ color: 'var(--rr-paper)' }}>2 tokens to them</b> — instantly. Cap is 5 conversions, so 10 tokens total free for the taking.</p>

        <div className="reward-visual">
          <div className="rv-side">
            <span className="lbl">They get</span>
            <div className="big">
              <div className="coin">2</div>
              <div className="text">2 tokens<small>added to their wallet</small></div>
            </div>
          </div>
          <span className="rv-eq">+</span>
          <div className="rv-side">
            <span className="lbl">You get</span>
            <div className="big">
              <div className="coin">2</div>
              <div className="text">2 tokens<small>added to your wallet</small></div>
            </div>
          </div>
        </div>

        <div className="code-section">
          <div className="code-left">
            <span className="code-meta">Your referral link · <b>2 of 5</b> conversions so far</span>
            <div className="code-row">
              <div className="code-input">rankrush.in/r/<b>astitva-rt7k</b></div>
              <button className={`btn-copy${copied ? ' copied' : ''}`} onClick={handleCopy}>
                {copied ? <><Check size={16} />Copied</> : <><Copy size={16} />Copy link</>}
              </button>
            </div>
          </div>
          <div className="share-cluster">
            <a className="share-btn wa" title="Share to WhatsApp"><MessageCircle size={18} /></a>
            <a className="share-btn tw" title="Share to X"><Share2 size={18} /></a>
            <a className="share-btn ig" title="Share to Instagram"><Share2 size={18} /></a>
            <a className="share-btn" title="Email"><Mail size={18} /></a>
          </div>
        </div>

        <div className="progress-strip">
          <div className="ps-num">+4<small> tokens earned</small></div>
          <div>
            <div className="ps-meta">Conversions · 2 of 5</div>
            <div className="ps-cap"><b>3 more conversions</b> · up to <b>+6 tokens</b> waiting</div>
          </div>
          <div className="ps-slots">
            <div className="slot done">1</div>
            <div className="slot done">2</div>
            <div className="slot pending">3</div>
            <div className="slot">4</div>
            <div className="slot">5</div>
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
          <h4>Both wallets&nbsp;<span className="reward-pill"><Zap size={11} />+2 tokens</span></h4>
          <p>The moment payment clears, 2 tokens land in your wallet and 2 land in theirs. Capped at 5 conversions.</p>
        </div>
      </div>

      <div className="friends-card" style={{ marginTop: 32 }}>
        <div className="friends-head">
          <div>
            <h2>Friends you've referred</h2>
            <span className="sub">2 of 5 have converted · 1 signed up but hasn't subscribed yet</span>
          </div>
          <div className="right">
            <div className="tabs-mini">
              {TABS.map((t, i) => (
                <button key={t} className={activeTab === i ? 'on' : ''} onClick={() => setActiveTab(i)}>{t}</button>
              ))}
            </div>
            <button className="btn btn-accent btn-sm"><Plus size={14} />Invite another</button>
          </div>
        </div>

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
            {FRIENDS.map((f, i) => {
              const StatusIcon = f.statusIcon
              return (
                <tr key={i}>
                  <td>
                    <div className="friend-cell">
                      <div className="av" style={{ background: f.color }}>{f.initial}</div>
                      <div>
                        <span className="nm">{f.name}</span>
                        <span className="id">{f.email}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className={`f-status ${f.status}`}><StatusIcon size={11} />{f.statusLabel}</span></td>
                  <td><span className="date">{f.date}</span></td>
                  <td><span className={`tokens ${f.tokensClass}`}>{f.tokens}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="friends-foot">
          <span><b>+4 tokens</b> earned · <b>3 slots</b> left · up to <b>+6 more tokens</b> possible</span>
          <Link to="/tokens" style={{ color: 'var(--rr-violet-500)', fontWeight: 500 }}>View token history →</Link>
        </div>
      </div>

      <div className="refer-faq">
        <h3>Quick FAQ</h3>
        <dl>
          <div>
            <dt>How many friends can I refer?</dt>
            <dd>Up to <b>5 conversions</b>. You can <em>invite</em> as many people as you want — the cap is on paid conversions.</dd>
          </div>
          <div>
            <dt>When exactly do tokens arrive?</dt>
            <dd>The moment your friend's payment for any paid plan clears. Usually within a minute. We'll send you a notification when it happens.</dd>
          </div>
          <div>
            <dt>What if my friend pays but cancels later?</dt>
            <dd>Tokens you've already earned are yours to keep. They cancel their plan, you keep the 2 tokens. Their refund (if any) is between them and our billing partner.</dd>
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
