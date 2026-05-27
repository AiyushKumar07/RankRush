import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Coins, Flame, Gift, CircleMinus, RefreshCw, ArrowUp } from 'lucide-react'
import './TokensPage.css'

const LOG_DATA = [
  { type: 'spent', icon: CircleMinus, label: 'Spent', source: 'Calculus · Limits & Continuity', detail: 'Standard quiz · 18/20 score', date: 'Today · 8:42 AM', amt: '−1', amtClass: 'neg' },
  { type: 'earned', icon: Flame, label: 'Bonus', iconClass: 'bonus', source: '14-day streak milestone', detail: 'Earned · keep going for 21', date: 'Yesterday · 11:24 PM', amt: '+1', amtClass: 'pos' },
  { type: 'spent', icon: CircleMinus, label: 'Spent', source: 'JEE Main · Mock test 04', detail: 'Full-length · 78/90 score', date: 'Yesterday · 4:18 PM', amt: '−3', amtClass: 'neg' },
  { type: 'earned', icon: Gift, label: 'Referral', iconClass: 'earned', source: 'Tanvi S. upgraded to Starter via your link', detail: '2 of 5 conversions · +2 to you, +2 to Tanvi', date: '2 days ago', amt: '+2', amtClass: 'pos' },
  { type: 'spent', icon: CircleMinus, label: 'Spent', source: 'Physics · Wave optics', detail: 'Standard quiz · 16/18 score', date: '4 days ago', amt: '−1', amtClass: 'neg' },
  { type: 'earned', icon: Flame, label: 'Bonus', iconClass: 'bonus', source: '7-day streak milestone', detail: 'Earned · halfway to next bonus', date: '5 days ago', amt: '+1', amtClass: 'pos' },
  { type: 'spent', icon: CircleMinus, label: 'Spent', source: 'Chemistry · Periodic table', detail: 'Standard quiz · 19/20 score', date: '5 days ago', amt: '−1', amtClass: 'neg' },
  { type: 'reset', icon: RefreshCw, label: 'Reset', iconClass: 'reset', source: 'Monthly allowance refill (Free)', detail: '2 tokens added · cycle started', date: '1 May 2026', amt: '+2', amtClass: 'neutral' },
  { type: 'spent', icon: CircleMinus, label: 'Spent', source: 'Math · Trigonometry identities', detail: 'Standard quiz · 18/20 score', date: '1 May 2026', amt: '−1', amtClass: 'neg' },
]

const FILTERS = [
  { label: 'All', count: 9 },
  { label: 'Earned', count: 4 },
  { label: 'Spent', count: 5 },
]

export default function TokensPage() {
  const [activeFilter, setActiveFilter] = useState(0)

  const filteredRows = LOG_DATA.filter(row => {
    if (activeFilter === 0) return true
    if (activeFilter === 1) return row.type === 'earned' || row.type === 'reset'
    return row.type === 'spent'
  })

  return (
    <div className="main">

      <div className="page-head">
        <div className="crumb">/ Account / Tokens</div>
        <h1>Your token wallet</h1>
        <p className="sub">One token = one quiz attempt. Earn them by showing up, spend them on questions, watch the balance tick.</p>
      </div>

      <div className="wallet-hero">
        <div className="wallet-left">
          <span className="lbl">Available balance</span>
          <div className="balance-row">
            <span className="balance-num">12</span>
            <span className="balance-unit">tokens</span>
          </div>
          <p className="balance-sub">Worth <b>12 quiz attempts</b>, or <b>4 mock tests</b>, or any mix in between.</p>

          <div className="balance-chips">
            <span className="bal-chip"><Coins size={13} />From plan <b>2</b></span>
            <span className="bal-chip"><Flame size={13} />Streak bonus <b>+5</b></span>
            <span className="bal-chip"><Gift size={13} />Referrals <b>+4</b></span>
          </div>
        </div>

        <div className="wallet-right">
          <h3>Your plan · Free</h3>
          <div>
            <div className="row-bw" style={{ marginBottom: 8 }}>
              <span>Plan allowance this month</span>
              <span><b>2</b> / 2 used</span>
            </div>
            <div className="wallet-meter"><div className="fill" style={{ width: '100%' }}></div></div>
          </div>
          <hr />
          <div className="row-bw"><span>Resets on</span><span><b>1 June 2026</b></span></div>
          <div className="row-bw"><span>Days left in cycle</span><span><b>4</b> days</span></div>
          <hr />
          <div className="cta-line">
            <Link to="/pricing" className="btn btn-lime" style={{ flex: 1 }}><ArrowUp size={14} />Upgrade plan</Link>
          </div>
        </div>
      </div>

      <div className="row-2">
        <div className="dcard">
          <div className="dcard-head">
            <div>
              <h2>Earn more tokens</h2>
              <span className="sub">Four ways to top up without paying — show up, climb, win.</span>
            </div>
          </div>
          <div className="earn-grid">
            <div className="earn-tile streak">
              <div className="top">
                <div className="ico"><Flame size={18} /></div>
                <span className="reward">+1 token</span>
              </div>
              <h4>Hit a 7-day streak</h4>
              <p>One bonus token every 7 consecutive days. Miss a day, restart at zero.</p>
              <div className="progress-label"><span>17 / 21 days · next bonus</span><span>4 days</span></div>
              <div className="meter"><div className="fill" style={{ width: '81%' }}></div></div>
            </div>

            <div className="earn-tile refer">
              <div className="top">
                <div className="ico"><Gift size={18} /></div>
                <span className="reward">+2 tokens each</span>
              </div>
              <h4>Refer up to 5 friends</h4>
              <p>2 tokens for you and 2 for them — the moment they buy any paid plan.</p>
              <div className="progress-label"><span>2 of 5 referrals converted</span><span>+4 tokens earned</span></div>
              <div className="meter"><div className="fill" style={{ width: '40%' }}></div></div>
            </div>
          </div>
        </div>

        <div className="dcard">
          <div className="dcard-head">
            <div>
              <h2>Spending breakdown</h2>
              <span className="sub">May 2026 · so far</span>
            </div>
          </div>
          <div className="spend-list">
            <div className="spend-row">
              <span className="name"><span className="d" style={{ background: 'var(--rr-violet-500)' }}></span>Standard quizzes</span>
              <div className="bar"><div className="fill" style={{ width: '80%', background: 'var(--rr-violet-500)' }}></div></div>
              <span className="amt">8</span>
            </div>
            <div className="spend-row">
              <span className="name"><span className="d" style={{ background: 'var(--rr-cyan-500)' }}></span>Mock tests</span>
              <div className="bar"><div className="fill" style={{ width: '60%', background: 'var(--rr-cyan-500)' }}></div></div>
              <span className="amt">6</span>
            </div>
          </div>
          <div className="spend-total">
            <span className="label">Spent · this month</span>
            <span className="total">14<small> tokens</small></span>
          </div>
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
            <span className="sub">Every token in, every token out — last 30 days.</span>
          </div>
          <div className="log-filters">
            {FILTERS.map((f, i) => (
              <button
                key={f.label}
                className={`chip${activeFilter === i ? ' on' : ''}`}
                onClick={() => setActiveFilter(i)}
              >
                {f.label} <span className="n">{f.count}</span>
              </button>
            ))}
          </div>
        </div>

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
            {filteredRows.map((row, i) => {
              const Icon = row.icon
              const typeClass = row.iconClass || row.type
              return (
                <tr key={i} data-row-type={row.type}>
                  <td>
                    <span className={`log-type ${typeClass}`}>
                      <div className="ico"><Icon size={13} /></div>
                      <span className="lbl-text">{row.label}</span>
                    </span>
                  </td>
                  <td>
                    <span className="source">{row.source}<small>{row.detail}</small></span>
                  </td>
                  <td><span className="date">{row.date}</span></td>
                  <td className={`amt ${row.amtClass}`}>{row.amt}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="log-foot">
          <span>Showing {filteredRows.length} of 9 transactions · May 2026</span>
          <a href="#" style={{ color: 'var(--rr-violet-500)', fontWeight: 500 }}>Export CSV →</a>
        </div>
      </div>

    </div>
  )
}
