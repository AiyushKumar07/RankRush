/**
 * LegalLayout — shared chrome for the Privacy Policy & Terms pages.
 *
 * Public-facing, theme-aware (mounts useTheme via <ThemeToggle/> so the
 * persisted light/dark choice is applied on load). Renders the marketing nav,
 * a header, a sticky table-of-contents built from `sections`, the section
 * bodies, a contact card, and the footer.
 *
 * Each section: { id, title, content } — `content` is JSX.
 */
import { Link } from 'react-router-dom'
import { ArrowRight, Mail } from 'lucide-react'
import RRBrand from '../../components/brand/RRBrand'
import ThemeToggle from '../../components/ui/ThemeToggle'
import './LegalPage.css'

const SUPPORT_EMAIL = 'support@rankrush.co.in'

export default function LegalLayout({
  eyebrow,
  title,
  updated,
  intro,
  sections,
  crosslink,
}) {
  return (
    <div className="legal-root">
      {/* ---------- Nav ---------- */}
      <nav className="legal-nav">
        <div className="legal-nav-inner">
          <RRBrand />
          <div className="legal-nav-right">
            <ThemeToggle />
            <Link to="/login" className="btn btn-ghost btn-sm legal-nav-signin">Sign in</Link>
            <Link to="/signup" className="btn btn-accent btn-sm">Get started<ArrowRight size={16} /></Link>
          </div>
        </div>
      </nav>

      {/* ---------- Header ---------- */}
      <header className="legal-header legal-shell">
        <span className="legal-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <span className="legal-meta">Last updated · {updated}</span>
        <p className="legal-intro">{intro}</p>
      </header>

      {/* ---------- Body ---------- */}
      <div className="legal-body legal-shell">
        <aside className="legal-toc">
          <div className="legal-toc-label">On this page</div>
          <nav aria-label="Table of contents">
            {sections.map((s, i) => (
              <a key={s.id} href={`#${s.id}`}>
                {String(i + 1).padStart(2, '0')} — {s.title}
              </a>
            ))}
          </nav>
        </aside>

        <main className="legal-content">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="legal-section">
              <h2>
                <span className="legal-num">{String(i + 1).padStart(2, '0')}</span>
                {s.title}
              </h2>
              {s.content}
            </section>
          ))}

          <div className="legal-contact">
            <h3>Questions?</h3>
            <p>
              If anything here is unclear, or you want to exercise a right described above,
              reach the RankRush support team and we'll get back to you.
            </p>
            <p>
              <Mail size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </p>
          </div>

          {crosslink && (
            <p className="legal-crosslink">
              {crosslink.label}{' '}
              <Link to={crosslink.to}>{crosslink.linkText}</Link>.
            </p>
          )}
        </main>
      </div>

      {/* ---------- Footer ---------- */}
      <footer className="legal-footer">
        <div className="legal-footer-inner">
          <span className="copy">© 2026 RANKRUSH. ALL RIGHTS RESERVED.</span>
          <div className="links">
            <Link to="/" >Home</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
