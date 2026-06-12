import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CircleCheck,
  TrendingUp,
  Radio,
  School,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import RRBrand from '../../components/brand/RRBrand'
import ThemeToggle from '../../components/ui/ThemeToggle'
import './LandingPage.css'

const STREAK_PATTERN = [0,1,2,3,4,3,2,1,0,1,2,3,4,4,3,2,3,4,4,4,4,4,3,4,4,4,4,4]

export default function LandingPage() {
  const navigate = useNavigate()
  const [heroEmail, setHeroEmail] = useState('')

  // Carry the typed email into the signup flow so it's prefilled there.
  const handleHeroStart = (e) => {
    e.preventDefault()
    const email = heroEmail.trim()
    navigate(email ? `/signup?email=${encodeURIComponent(email)}` : '/signup')
  }

  return (
    <>
      {/* =========== NAV =========== */}
      <nav className="nav">
        <div className="nav-inner">
          <RRBrand />
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <Link to="/login">Leaderboard</Link>
          </div>
          <div className="nav-right">
            <ThemeToggle />
            <Link to="/login" className="btn btn-ghost btn-sm nav-signin">Sign in</Link>
            <Link to="/signup" className="btn btn-accent btn-sm">Get started<ArrowRight size={16} /></Link>
          </div>
        </div>
      </nav>

      {/* =========== HERO =========== */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-glow"></div>
        <div className="shell">
          <div className="hero-grid">
            <div className="hero-left">
              <span className="badge live"><Radio size={14} />12,481 students competing this week</span>
              <h1>
                Rush the <span className="underline">ranks</span>.<br />
                <span className="accent">Every weekday.</span>
              </h1>
              <p className="hero-sub">
                A quiz platform for class 9 through droppers. One token, one quiz, one shot at the top.
                Daily streak, live leaderboard, and the same dopamine loop Duolingo borrowed from slot machines — pointed at your syllabus.
              </p>
              <div className="hero-cta">
                <form className="email-row" onSubmit={handleHeroStart}>
                  <input
                    type="email"
                    placeholder="your@university.edu"
                    value={heroEmail}
                    onChange={(e) => setHeroEmail(e.target.value)}
                  />
                  <button type="submit" className="btn btn-accent">Start free<ArrowRight size={16} /></button>
                </form>
              </div>
              <div className="hero-trust">
                <span><CircleCheck size={14} />Free forever plan</span>
                <span><CircleCheck size={14} />1-token welcome bonus</span>
                <span><CircleCheck size={14} />No credit card</span>
              </div>
            </div>

            <div className="hero-right">
              <div className="hero-rankbar-card">
                <div className="hero-callout">
                  <TrendingUp size={16} />You climbed <span className="lime">+14 ranks</span> · Calculus
                </div>

                <div className="browser-dots"><span></span><span></span><span></span></div>

                <div className="rb-eyebrow">
                  <span className="live">Live · this week</span>
                  <span>JEE · Class 12 · India</span>
                </div>

                <div className="rb-bar">
                  <div className="rb-markers"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
                  <div className="rb-fill">
                    <div className="rb-you">
                      YOU · #<span className="rb-rank-flip"><span className="stream"><span>—</span><span>247</span><span>142</span><span>88</span></span></span>
                    </div>
                  </div>
                </div>

                <div className="particles">
                  <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
                </div>

                <div className="rb-meta">
                  <span><b>#12,481</b> bottom</span>
                  <span>You're ahead of <b>71.8%</b></span>
                  <span><b>#1</b> top</span>
                </div>

                <div className="lb-rows">
                  <div className="lb-row demo">
                    <span className="rank">#1</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="avatar" style={{ background: 'var(--rr-amber-500)' }}>A</span>
                      <span className="name">Aanya G.</span>
                    </div>
                    <span className="score tabular">2,847 pts</span>
                    <span className="delta up"><ArrowUp size={10} />3</span>
                  </div>
                  <div className="lb-row">
                    <span className="rank">#2</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="avatar" style={{ background: 'var(--rr-cyan-500)' }}>R</span>
                      <span className="name">Rohan M.</span>
                    </div>
                    <span className="score tabular">2,712 pts</span>
                    <span className="delta down"><ArrowDown size={10} />1</span>
                  </div>
                  <div className="lb-row you">
                    <span className="rank">#88</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="avatar" style={{ background: 'var(--rr-violet-500)' }}>Y</span>
                      <span className="name">You</span>
                    </div>
                    <span className="score tabular">1,944 pts</span>
                    <span className="delta up"><ArrowUp size={10} />14</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========== COACHING CENTRES =========== */}
      <section className="shell">
        <div className="uni-strip">
          <div className="label">Trusted by students at India's top 10 coaching centres</div>
          <div className="uni-row">
            <span className="uni"><School size={18} />Allen</span>
            <span className="uni"><School size={18} />Aakash</span>
            <span className="uni"><School size={18} />FIITJEE</span>
            <span className="uni"><School size={18} />Resonance</span>
            <span className="uni"><School size={18} />Vibrant</span>
            <span className="uni"><School size={18} />Career Point</span>
            <span className="uni"><School size={18} />Bansal</span>
          </div>
        </div>
      </section>

      {/* =========== FEATURES =========== */}
      <section className="section shell" id="features">
        <div className="section-head">
          <span className="eyebrow line">01 — Everything in one loop</span>
          <h2>Six things that hook you. <span className="accent">All built around tomorrow.</span></h2>
          <p>Open the app, take one quiz, climb the rank bar, save your streak. That's it. Everything else exists to make that loop tighter.</p>
        </div>

        <div className="bento">
          {/* The RankBar — featured */}
          <div className="bento-card bento-rankbar">
            <span className="lbl">★ The signature moment</span>
            <h3>A rank bar that follows you everywhere.</h3>
            <p className="lead">After every quiz, the bar slides. Tabular rank counter ticks. Lime burst on rank-ups. It's the one thing you'll glance at first when you open the app — and the last thing you'll see before you close it.</p>

            <div className="bento-rankbar-visual">
              <div className="bento-rb-label"><span>Last week</span><span><b>#412</b></span></div>
              <div className="bento-rb-bar b1"><div className="fill"></div></div>
              <div className="bento-rb-label"><span>3 days ago</span><span><b>#247</b></span></div>
              <div className="bento-rb-bar b2"><div className="fill"></div></div>
              <div className="bento-rb-label"><span>Right now</span><span style={{ color: 'var(--rr-lime-400)' }}><b>#88</b> · +14</span></div>
              <div className="bento-rb-bar b3"><div className="fill"><div className="chip">YOU</div></div></div>
            </div>
          </div>

          {/* Streak */}
          <div className="bento-card bento-streak">
            <span className="lbl">Daily loop</span>
            <h3>Streaks you'll actually fight for.</h3>
            <p className="lead">One quiz a day. Cells warm from chalk to amber to flame. Miss a day, lose the streak — there is no soft-landing.</p>
            <div className="streak-mini">
              {STREAK_PATTERN.map((level, i) => (
                <div key={i} className={`streak-cell-mini${level > 0 ? ` s${level}` : ''}`} />
              ))}
            </div>
            <div className="streak-num"><span>17</span><small> days</small></div>
          </div>

          {/* Tokens */}
          <div className="bento-card bento-tokens">
            <span className="lbl">The economy</span>
            <h3>1 token. 1 quiz. Simple.</h3>
            <p className="lead">No abstract credits, no XP-to-coin conversion. One quiz costs one token. Earn them by inviting, streaking, or buying a top-up.</p>
            <div className="token-visual">
              <div className="token-stack">
                <div className="token-coin c1">1</div>
                <div className="token-coin c2">1</div>
                <div className="token-coin c3">1</div>
              </div>
              <div className="token-cta">
                <span className="big tabular">12</span>
                <span className="small">tokens in your wallet</span>
              </div>
            </div>
          </div>

          {/* AI */}
          <div className="bento-card bento-ai">
            <span className="lbl">Behind the scenes</span>
            <h3>Graded in milliseconds. Explained in words.</h3>
            <p className="lead">Auto-graded MCQs, instant feedback, plain-English explainers — no waiting for a teacher.</p>
            <div className="ai-visual">
              <div className="ai-q">If f(x) = x², what is f'(2)?</div>
              <div className="ai-opts">
                <div className="ai-opt"><span className="dot"></span>2</div>
                <div className="ai-opt correct"><span className="dot"></span>4</div>
                <div className="ai-opt"><span className="dot"></span>8</div>
              </div>
            </div>
          </div>

          {/* Live leaderboard */}
          <div className="bento-card bento-live">
            <span className="lbl">Always live</span>
            <h3>The leaderboard updates while you sleep.</h3>
            <p className="lead">Daily, weekly, all-time. Filter by topic, class, or coaching center.</p>
            <div className="live-leader">
              <div className="live-row top">
                <span className="r">#1</span>
                <span className="n">Aanya G.</span>
                <span className="s">2,847</span>
              </div>
              <div className="live-row">
                <span className="r">#2</span>
                <span className="n">Rohan M.</span>
                <span className="s">2,712</span>
              </div>
              <div className="live-row">
                <span className="r">#3</span>
                <span className="n">Tanvi S.</span>
                <span className="s">2,604</span>
              </div>
              <div className="live-row">
                <span className="r">#4</span>
                <span className="n">Karthik V.</span>
                <span className="s">2,531</span>
              </div>
            </div>
          </div>

          {/* Study groups */}
          <div className="bento-card bento-groups">
            <span className="lbl">Collab</span>
            <h3>Study groups that aren't just a WhatsApp group.</h3>
            <p className="lead">Challenge a friend to a head-to-head. Share a custom quiz. See who's online studying right now.</p>
            <div className="groups-visual">
              <div className="group-line" style={{ transform: 'rotate(-22deg) translate(-32px, 0)' }}></div>
              <div className="group-line" style={{ transform: 'rotate(22deg) translate(32px, 0)' }}></div>
              <div className="group-avatar g1">T</div>
              <div className="group-avatar g2">A</div>
              <div className="group-avatar center">Y</div>
              <div className="group-avatar g3">R</div>
              <div className="group-avatar g4">K</div>
            </div>
          </div>

          {/* Practice papers */}
          <div className="bento-card bento-papers">
            <span className="lbl">Real material</span>
            <h3>Previous-year papers. The actual ones.</h3>
            <p className="lead">JEE Main, Advanced, NEET, board exams — searchable, timed, with detailed solutions.</p>
            <div className="papers-visual">
              <div className="paper-card">
                <div className="yr">2024</div>
                <div className="name">JEE Main · Jan</div>
                <div className="lines"><span></span><span></span><span></span><span></span></div>
              </div>
              <div className="paper-card">
                <div className="yr">2023</div>
                <div className="name">JEE Adv · Paper 1</div>
                <div className="lines"><span></span><span></span><span></span><span></span></div>
              </div>
              <div className="paper-card">
                <div className="yr">2022</div>
                <div className="name">NEET</div>
                <div className="lines"><span></span><span></span><span></span><span></span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========== HOW IT WORKS =========== */}
      <section className="section shell" id="how">
        <div className="how-card">
        <div className="section-head">
          <span className="eyebrow line">02 — Getting started</span>
          <h2>From signup to first rank, <span className="accent">three minutes.</span></h2>
          <p>No onboarding gauntlet. No 12-question survey. Tell us your class and what you're prepping for, then start.</p>
        </div>

        <div className="steps">
          <div className="step">
            <div className="num">01</div>
            <h4>Sign up with your email.</h4>
            <p>One field, one click. Your free token is waiting.</p>
            <div className="step-illus">
              <div className="illus-signup" style={{ width: '100%' }}>
                <div className="field f"></div>
                <div className="field"></div>
                <div className="btn-mini"></div>
              </div>
            </div>
          </div>

          <div className="step">
            <div className="num">02</div>
            <h4>Take your first quiz.</h4>
            <p>Pick a topic. Answer 10 questions. Get graded instantly.</p>
            <div className="step-illus">
              <div className="illus-practice">
                <div className="q">What is the derivative of sin(x)?</div>
                <div className="opt"></div>
                <div className="opt on"></div>
                <div className="opt"></div>
              </div>
            </div>
          </div>

          <div className="step">
            <div className="num">03</div>
            <h4>Watch your rank climb.</h4>
            <p>The bar slides. The counter ticks. The lime particles fire.</p>
            <div className="step-illus">
              <div className="illus-rankup">
                <div className="bar"></div>
                <div className="chip">YOU · #88</div>
                <div className="delta">+14</div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* =========== PRICING =========== */}
      <section className="section shell" id="pricing">
        <div className="section-head">
          <span className="eyebrow line">03 — Pricing</span>
          <h2>Free works. <span className="accent">Pro removes the limits.</span></h2>
          <p>One token equals one quiz. The full pricing page has a third plan and add-on token packs — this is the snapshot for the landing.</p>
        </div>

        <div className="pricing">
          <div className="plan">
            <div className="top">
              <div>
                <h3>Free</h3>
                <p className="desc">For one student, casually.</p>
              </div>
              <span className="badge neutral">Forever</span>
            </div>
            <div className="price-row">
              <span className="price">₹0</span>
              <span className="per">/month</span>
            </div>
            <ul className="feats">
              <li className="feat"><CircleCheck size={16} /><b>2 tokens</b>&nbsp;per month</li>
              <li className="feat"><CircleCheck size={16} />Full library access</li>
              <li className="feat"><CircleCheck size={16} />Live leaderboards</li>
              <li className="feat"><CircleCheck size={16} />Streak garden &amp; rank bar</li>
              <li className="feat"><CircleCheck size={16} />Up to 2 study groups</li>
            </ul>
            <Link to="/signup" className="btn btn-secondary" style={{ width: '100%' }}>Start free</Link>
          </div>

          <div className="plan featured">
            <div className="top">
              <div>
                <h3>Pro</h3>
                <p className="desc">For students who refuse to wait.</p>
              </div>
              <span className="badge lime">★ Most picked</span>
            </div>
            <div className="price-row">
              <span className="price">₹299</span>
              <span className="per">/month</span>
            </div>
            <ul className="feats">
              <li className="feat"><CircleCheck size={16} /><b>50 tokens</b>&nbsp;per month</li>
              <li className="feat"><CircleCheck size={16} />Previous-year papers, all years</li>
              <li className="feat"><CircleCheck size={16} />Advanced analytics — weak topics, time-per-Q</li>
              <li className="feat"><CircleCheck size={16} />Custom quiz challenges to friends</li>
              <li className="feat"><CircleCheck size={16} />Priority support &amp; early features</li>
            </ul>
            <Link to="/signup" className="btn btn-lime" style={{ width: '100%' }}>Go Pro<ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      {/* =========== BIG CTA =========== */}
      <section className="shell">
        <div className="big-cta">
          <div className="big-cta-content">
            <span className="badge live" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#FAFAF7', padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500 }}><Radio size={14} />247 students joined this hour</span>
            <h2 style={{ marginTop: 20 }}>Your move. <span className="accent">Make tomorrow count.</span></h2>
            <p>Sign up free. The first token is on the house. The first rank is yours to earn.</p>
            <div className="row">
              <Link to="/signup" className="btn btn-lime btn-lg">Get started free<ArrowRight size={16} /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========== FOOTER =========== */}
      <footer className="footer shell">
        <div className="footer-grid">
          <div className="footer-col">
            <div style={{ marginBottom: 4 }}>
              <RRBrand size="sm" />
            </div>
            <p className="tagline">A quiz-and-rank platform for students who move fast. Built in Bengaluru.</p>
          </div>
          <div className="footer-col">
            <h5>Product</h5>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><Link to="/login">Leaderboard</Link></li>
              <li><Link to="/coming-soon">For coaching centers</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Learn</h5>
            <ul>
              <li><Link to="/coming-soon">JEE prep</Link></li>
              <li><Link to="/coming-soon">NEET prep</Link></li>
              <li><Link to="/coming-soon">Board exams</Link></li>
              <li><Link to="/coming-soon">Study guides</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Company</h5>
            <ul>
              <li><Link to="/coming-soon">About</Link></li>
              <li><Link to="/coming-soon">Careers</Link></li>
              <li><Link to="/coming-soon">Press</Link></li>
              <li><a href="mailto:support@rankrush.co.in">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="copy">© 2026 RANKRUSH. ALL RIGHTS RESERVED.</span>
          <div className="links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy#cookies">Cookies</Link>
            <Link to="/coming-soon">Status</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
