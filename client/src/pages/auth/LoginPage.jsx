import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import AuthLayout from '../../components/layouts/AuthLayout'
import GoogleAuthButton from '../../components/auth/GoogleAuthButton'
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
        <GoogleAuthButton redirectTo="/app" />
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
