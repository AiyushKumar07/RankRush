import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import RRBrand from '../brand/RRBrand'
import './AuthLayout.css'

export default function AuthLayout({ children, rightPanel }) {
  return (
    <div className="auth">
      <div className="auth-left">
        <div className="auth-top">
          <RRBrand />
          <Link to="/" className="home"><ArrowLeft size={14} />Back to home</Link>
        </div>

        <div className="auth-form-wrap">
          {children}
        </div>

        <div className="auth-foot">
          <span>© 2026 RankRush · v0.1</span>
          <span><Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link></span>
        </div>
      </div>

      {rightPanel && (
        <div className="auth-right">
          {rightPanel}
        </div>
      )}
    </div>
  )
}
