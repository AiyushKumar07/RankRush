/**
 * Coming Soon — public, standalone marketing-shell page (/coming-soon).
 * Shared placeholder for footer links whose pages aren't built yet
 * (For coaching centers, the Learn column, About, Careers, Press).
 * Self-contained, theme-aware, built on the global --rr-* tokens.
 */
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Mail } from 'lucide-react'
import RRBrand from '../../components/brand/RRBrand'
import ThemeToggle from '../../components/ui/ThemeToggle'
import './ComingSoonPage.css'

const SUPPORT_EMAIL = 'support@rankrush.co.in'

export default function ComingSoonPage() {
  return (
    <div className="cs-root">
      {/* ---------- Nav ---------- */}
      <nav className="cs-nav">
        <div className="cs-nav-inner">
          <Link to="/" aria-label="RankRush home"><RRBrand /></Link>
          <div className="cs-nav-right">
            <ThemeToggle />
            <Link to="/login" className="btn btn-ghost btn-sm cs-nav-signin">Sign in</Link>
            <Link to="/signup" className="btn btn-accent btn-sm">Get started<ArrowRight size={16} /></Link>
          </div>
        </div>
      </nav>

      {/* ---------- Hero ---------- */}
      <main className="cs-main">
        <span className="cs-eyebrow">Coming soon</span>
        <h1>We're still building this one.</h1>
        <p className="cs-lead">
          This page isn't live yet — we're heads-down shipping it. In the
          meantime, jump back into RankRush or get in touch and we'll let you
          know the moment it lands.
        </p>

        <div className="cs-actions">
          <Link to="/" className="btn btn-accent">
            <ArrowLeft size={16} />Back to home
          </Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="btn btn-ghost">
            <Mail size={16} />{SUPPORT_EMAIL}
          </a>
        </div>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="cs-footer">
        <div className="cs-footer-inner">
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
