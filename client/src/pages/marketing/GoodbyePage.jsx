/**
 * Goodbye — public, standalone farewell page (/goodbye).
 * Shown right after a user permanently deletes their account. Keeps the
 * tone light: a big waving emoji, a rotating set of cheeky "sad to see
 * you go" memes, and an easy door back in. Self-contained, theme-aware,
 * built on the global --rr-* tokens.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Heart } from 'lucide-react'
import RRBrand from '../../components/brand/RRBrand'
import ThemeToggle from '../../components/ui/ThemeToggle'
import './GoodbyePage.css'

// Each "meme" is an emoji + a one-liner. We rotate through them so the
// page rewards anyone who lingers a few seconds.
const MEMES = [
  { emoji: '😭', line: "It's not you, it's the JEE syllabus. (Okay, maybe a little you.)" },
  { emoji: '🥲', line: 'Your streak walked so it could… not walk anymore. RIP.' },
  { emoji: '👋', line: 'We deleted everything. Even the rank you were low-key proud of.' },
  { emoji: '🫠', line: 'Somewhere, a leaderboard just got 0.3% easier for everyone else.' },
  { emoji: '🪦', line: 'Here lies your progress. It tried its best. Mostly.' },
  { emoji: '💔', line: 'Breaking up is hard. Re-deriving integration by parts is harder.' },
  { emoji: '🐧', line: "If you're back tomorrow we'll pretend this never happened." },
]

export default function GoodbyePage() {
  const [i, setI] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % MEMES.length), 3200)
    return () => clearInterval(t)
  }, [])

  const meme = MEMES[i]

  return (
    <div className="gb-root">
      {/* Floating emoji confetti — purely decorative. */}
      <div className="gb-floaties" aria-hidden>
        {['😢', '👋', '💔', '🥲', '🫠', '🎈', '😭', '🪦', '✨', '🐧'].map((e, idx) => (
          <span key={idx} className={`gb-floatie gb-floatie-${idx}`}>{e}</span>
        ))}
      </div>

      {/* ---------- Nav ---------- */}
      <nav className="gb-nav">
        <div className="gb-nav-inner">
          <Link to="/" aria-label="RankRush home"><RRBrand /></Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* ---------- Hero ---------- */}
      <main className="gb-main">
        <div className="gb-emoji" key={meme.emoji}>{meme.emoji}</div>

        <span className="gb-eyebrow">Account deleted</span>
        <h1>Sad to see you go.</h1>

        <p className="gb-meme" key={i}>{meme.line}</p>

        <p className="gb-lead">
          Your account and everything tied to it has been permanently erased —
          no take-backs, no shadow copies. If you ever change your mind, the
          door's always open (and the leaderboard could use the competition).
        </p>

        <div className="gb-actions">
          <Link to="/signup" className="btn btn-accent">
            <RotateCcw size={16} />Create a new account
          </Link>
          <Link to="/" className="btn btn-ghost">
            <ArrowLeft size={16} />Back to home
          </Link>
        </div>

        <p className="gb-signoff">
          <Heart size={13} /> Thanks for rushing the ranks with us.
        </p>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="gb-footer">
        <div className="gb-footer-inner">
          <span className="copy">© 2026 RANKRUSH. ALL RIGHTS RESERVED.</span>
          <div className="links">
            <Link to="/">Home</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
