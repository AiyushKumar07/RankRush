import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import AuthLayout from '../../components/layouts/AuthLayout'
import './LoginPage.css'

function LoginRightPanel() {
  return (
    <>
      <div className="ar-top">
        <span className="eyebrow">★ Why students stay</span>
        <h2>One quiz a day. <em>One rank up.</em> That's the deal.</h2>
      </div>

      <div className="ar-rb">
        <div className="lbl"><span className="live">Live · this week</span><span>JEE Main · Class 12</span></div>
        <div className="rank-big">
          <span className="rank-num">#88</span>
          <span className="delta"><ArrowUp size={14} />+14 ranks</span>
        </div>
        <div className="bar"><div className="fill"></div></div>
        <div className="meta"><span><b>#12,481</b> bottom</span><span>You're ahead of <b>71.8%</b></span><span><b>#1</b> top</span></div>
      </div>

      <div>
        <p className="ar-quote">"I went from rank 1,204 to rank 88 in five weeks. The bar at the top did more for my motivation than any tutor ever did."</p>
        <div className="ar-quote-author">
          <div className="av">A</div>
          <div className="info"><span className="name">Aanya Gupta</span><span className="role">Class 12 · Allen, Kota</span></div>
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const togglePw = useCallback(() => setShowPw(prev => !prev), [])
  const toggleRemember = useCallback(() => setRemember(prev => !prev), [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }
    setSubmitting(true)
    try {
      const result = await login(email, password, 'STUDENT')
      if (result?.requiresVerification) {
        toast('Please verify your email first', { icon: '📧' })
        navigate('/signup')
        return
      }
      toast.success('Welcome back!')
      navigate('/app')
    } catch (err) {
      toast.error(err?.message || 'Invalid email or password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout rightPanel={<LoginRightPanel />}>
      <span className="eyebrow">Welcome back</span>
      <h1>Sign in and <em>climb again.</em></h1>
      <p className="sub">Don't have an account yet? <Link to="/signup">Sign up free →</Link></p>

      <div className="oauth-row">
        <button className="oauth-btn" type="button">
          <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
          Google
        </button>
        <button className="oauth-btn" type="button">
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
          Apple
        </button>
      </div>

      <div className="or-row"><hr /><span>or with email</span><hr /></div>

      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Email address</label>
          <div className="input-shell">
            <Mail size={16} className="left" />
            <input
              type="email"
              placeholder="you@university.edu"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="form-field">
          <label>Password <Link to="/forgot-password">Forgot?</Link></label>
          <div className="input-shell">
            <Lock size={16} className="left" />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="toggle-pw" type="button" onClick={togglePw} title="Show/hide">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="remember-row">
          <label onClick={toggleRemember}>
            <span className={`check${remember ? ' on' : ''}`}></span>
            Keep me signed in for 30 days
          </label>
        </div>

        <button className="submit-btn" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}<ArrowRight size={16} />
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--rr-fg-muted)', margin: '14px 0 0' }}>
        Are you an admin? <Link to="/admin/login" style={{ color: 'var(--rr-violet-500)', fontWeight: 600 }}>Use the admin sign-in</Link>
      </p>
    </AuthLayout>
  )
}
