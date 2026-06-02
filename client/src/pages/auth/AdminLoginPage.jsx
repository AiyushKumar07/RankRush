import { useState, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import RRBrand from '../../components/brand/RRBrand'
import './AdminLoginPage.css'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const togglePw = useCallback(() => setShowPw(prev => !prev), [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    return () => document.documentElement.removeAttribute('data-theme')
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }
    setSubmitting(true)
    try {
      await login(email, password, 'ADMIN')
      toast.success('Welcome, Admin.')
      navigate('/admin')
    } catch (err) {
      toast.error(err?.message || 'Invalid credentials')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-auth-page">
      <div className="bg-grid"></div>
      <div className="bg-glow"></div>

      <div className="admin-card">
        <div className="top">
          <div className="row">
            <RRBrand />
            <span className="env-tag">PROD · Admin</span>
          </div>
          <div>
            <h1>Sign in <em>privileged.</em></h1>
            <p className="sub">Admin console access. Two-factor required.</p>
          </div>
        </div>

        <div className="restricted">
          <ShieldAlert size={16} />
          <span><b>Restricted access.</b> All actions are logged. Unauthorized attempts trigger lock-out and SIEM alerts.</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Admin email</label>
            <div className="input-shell">
              <Mail size={16} className="left" />
              <input
                type="email"
                placeholder="you@rankrush.in"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Password <a>Lost it?</a></label>
            <div className="input-shell">
              <Lock size={16} className="left" />
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button className="toggle-pw" type="button" onClick={togglePw}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-field">
            <label>2FA code <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--rr-fg-dim)', fontFamily: 'var(--rr-font-sans)' }}>6 digits from Authenticator</span></label>
            <div className="totp-row">
              <input type="text" inputMode="numeric" maxLength="3" placeholder="•••" />
              <input type="text" inputMode="numeric" maxLength="3" placeholder="•••" />
            </div>
          </div>

          <button className="submit-btn" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in to admin'}<ArrowRight size={16} />
          </button>
        </form>

        <div className="foot">
          <Link to="/login">Not an admin? Use student sign-in →</Link>
        </div>
      </div>

      <div className="below-card">
        v0.1 · <a>Status</a> · <a>Privacy</a> · <a>Terms</a>
      </div>
    </div>
  )
}
