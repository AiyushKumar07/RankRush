import { useState, useCallback, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, User, Mail, Lock,
  Target, Trophy, HeartPulse, BookOpen, School,
  Coins, TrendingUp, Flame, Gift,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { authAPI } from '../../services/api'
import AuthLayout from '../../components/layouts/AuthLayout'
import GoogleAuthButton from '../../components/auth/GoogleAuthButton'
import './SignupPage.css'

const STEP_LABELS = { 1: 'Account basics', 2: 'Goals', 3: 'Verify email' }

function SignupRightPanel() {
  return (
    <>
      <span className="eyebrow">★ What you get on day one</span>
      <h2>One token. One quiz. <em>One climb.</em></h2>
      <div className="perk-list">
        <div className="perk">
          <div className="ico"><Coins size={18} /></div>
          <div><h4>1 free token, instantly</h4><p>Enough to take your first calibration quiz. No card required, no trial countdown.</p></div>
        </div>
        <div className="perk">
          <div className="ico"><TrendingUp size={18} /></div>
          <div><h4>Live rank bar across the app</h4><p>See where you stand among <b style={{ color: '#FAFAF7' }}>12,481 students</b> after your first attempt — and watch it move every day.</p></div>
        </div>
        <div className="perk">
          <div className="ico"><Flame size={18} /></div>
          <div><h4>Streak garden grows from day one</h4><p>Each day you study, a cell warms from chalk to amber. Hit 7 days, earn a bonus token.</p></div>
        </div>
        <div className="perk">
          <div className="ico"><Gift size={18} /></div>
          <div><h4>Refer 5 friends, earn 10 tokens</h4><p>2 tokens for you and 2 for them when they buy any paid plan.</p></div>
        </div>
      </div>
      <div className="signup-counter"><b>247 students</b> joined in the last hour</div>
    </>
  )
}

export default function SignupPage() {
  const [step, setStep] = useState(1)
  const [selectedGoals, setSelectedGoals] = useState(['jee-main'])
  const [submitting, setSubmitting] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailErrorAllowLogin, setEmailErrorAllowLogin] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')

  const [studentClass, setStudentClass] = useState('Class 12')
  const [board, setBoard] = useState('CBSE')
  const [school, setSchool] = useState('')

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const otpRefs = useRef([])

  const { studentSignup, verifyEmail, pendingVerification } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    if (pendingVerification) {
      setStep(3)
      setEmail(pendingVerification.email)
    }
  }, [pendingVerification])

  // Prefill referral code from ?rid= when the user lands via a referral link.
  useEffect(() => {
    const rid = searchParams.get('rid')
    if (rid && !referralCode) setReferralCode(rid.toUpperCase())
  }, [searchParams, referralCode])

  const goTo = useCallback((n) => { setEmailError(''); setEmailErrorAllowLogin(false); setStep(n); }, [])

  const pwStrength = (() => {
    if (password.length < 8) return 'weak'
    const hasNum = /\d/.test(password)
    const hasSym = /[^a-zA-Z0-9]/.test(password)
    if (password.length >= 10 && hasNum && hasSym) return 'strong'
    if (password.length >= 8 && (hasNum || hasSym)) return 'med'
    return 'weak'
  })()

  const handleSignup = async (e) => {
    e?.preventDefault()
    if (!firstName || !lastName || !email || !password) {
      toast.error('Please fill in all fields')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    // Map the goal chips to the backend's target enum (Boards | NEET | JEE | Other), deduped.
    const GOAL_TO_TARGET = { 'jee-main': 'JEE', 'jee-adv': 'JEE', neet: 'NEET', boards: 'Boards' }
    const target = [...new Set(selectedGoals.map((g) => GOAL_TO_TARGET[g]).filter(Boolean))]

    setSubmitting(true)
    try {
      await studentSignup({
        firstName,
        lastName,
        email,
        password,
        referralCode: referralCode || undefined,
        class: studentClass,
        board,
        school: school || undefined,
        target: target.length ? target : undefined,
      })
      toast.success('Account created! Check your email for the OTP.')
      setStep(3)
    } catch (err) {
      toast.error(err?.message || 'Signup failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOtpChange = (idx, value) => {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[idx] = value
    setOtp(next)
    if (value && idx < 5) otpRefs.current[idx + 1]?.focus()
  }

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...otp]
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || ''
    }
    setOtp(next)
    const focusIdx = Math.min(pasted.length, 5)
    otpRefs.current[focusIdx]?.focus()
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length !== 6) {
      toast.error('Enter the 6-digit code')
      return
    }
    const userId = pendingVerification?.userId
    if (!userId) {
      toast.error('No pending verification. Please sign up again.')
      setStep(1)
      return
    }
    setSubmitting(true)
    try {
      await verifyEmail(userId, code)
      toast.success('Email verified! Welcome to RankRush.')
      navigate('/app')
    } catch (err) {
      toast.error(err?.message || 'Invalid OTP. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="signup-page">
      <AuthLayout rightPanel={<SignupRightPanel />}>

        {/* Step badge */}
        <div className="step-label">Step <b>{step}</b> of 3 · {STEP_LABELS[step]}</div>
        <div className="stepper">
          <div className={`step-dot${step === 1 ? ' active' : ''}${step > 1 ? ' done' : ''}`}><span>1</span></div>
          <div className={`step-line${step > 1 ? ' done' : ''}`}></div>
          <div className={`step-dot${step === 2 ? ' active' : ''}${step > 2 ? ' done' : ''}`}><span>2</span></div>
          <div className={`step-line${step > 2 ? ' done' : ''}`}></div>
          <div className={`step-dot${step === 3 ? ' active' : ''}`}><span>3</span></div>
        </div>

        {/* STEP 1 */}
        <div className={`step-screen${step === 1 ? ' on' : ''}`}>
          <span className="eyebrow">Get started</span>
          <h1>Create your <em>RankRush</em> account.</h1>
          <p className="sub">Already have one? <Link to="/login">Sign in →</Link></p>

          <div className="oauth-row">
            <GoogleAuthButton redirectTo="/app" referralCode={referralCode || undefined} />
          </div>
          <div className="or-row"><hr /><span>or with email</span><hr /></div>

          <form onSubmit={async (e) => {
            e.preventDefault()
            if (!firstName || !lastName || !email || !password) {
              toast.error('Please fill in all fields')
              return
            }
            if (password.length < 8) {
              toast.error('Password must be at least 8 characters')
              return
            }
            setCheckingEmail(true)
            setEmailError('')
            setEmailErrorAllowLogin(false)
            try {
              const res = await authAPI.checkEmail(email)
              if (res?.data?.invalidSyntax) {
                setEmailError('Enter a valid email address.')
                setCheckingEmail(false)
                return
              }
              if (res?.data?.disposable) {
                setEmailError('Temporary / disposable email addresses are not allowed. Please use a permanent inbox.')
                setCheckingEmail(false)
                return
              }
              if (!res?.data?.available) {
                setEmailError('This email is already registered.')
                setEmailErrorAllowLogin(true)
                setCheckingEmail(false)
                return
              }
              goTo(2)
            } catch {
              // If check fails, allow proceeding — the signup call will catch it
              goTo(2)
            } finally {
              setCheckingEmail(false)
            }
          }}>
            <div className="two-col">
              <div className="form-field">
                <label>First name</label>
                <div className="input-shell"><User size={16} className="left" /><input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" /></div>
              </div>
              <div className="form-field">
                <label>Last name</label>
                <div className="input-shell"><User size={16} className="left" /><input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" /></div>
              </div>
            </div>
            <div className="form-field">
              <label>Email address</label>
              <div className={`input-shell${emailError ? ' error' : ''}`}><Mail size={16} className="left" /><input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(''); setEmailErrorAllowLogin(false) }} placeholder="you@email.com" /></div>
              {emailError && (
                <div className="email-error">
                  <span>{emailError}</span>
                  {emailErrorAllowLogin && (
                    <Link to="/login" className="email-error-link">Log in instead →</Link>
                  )}
                </div>
              )}
            </div>
            <div className="form-field">
              <label>Password</label>
              <div className="input-shell"><Lock size={16} className="left" /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" /></div>
              {password && (
                <>
                  <div className={`pw-strength ${pwStrength}`}><span></span><span></span><span></span></div>
                  <div className="pw-hint"><span>Use 10+ characters · 1 number · 1 symbol</span><span className={`lvl ${pwStrength}`}>{pwStrength === 'strong' ? 'Strong' : pwStrength === 'med' ? 'Medium' : 'Weak'}</span></div>
                </>
              )}
            </div>
            <div className="form-field">
              <label>Referral code <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--rr-fg-dim)', fontFamily: 'var(--rr-font-sans)' }}>(optional)</span></label>
              <div className="input-shell"><Gift size={16} className="left" /><input value={referralCode} onChange={(e) => setReferralCode(e.target.value)} placeholder="e.g. RRAB1C2D" /></div>
            </div>
            <button className="submit-btn" type="submit" disabled={checkingEmail}>
              {checkingEmail ? 'Checking…' : 'Continue'}<ArrowRight size={16} />
            </button>
          </form>
          <p className="terms">By continuing you agree to RankRush's <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms</Link> and <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.</p>
        </div>

        {/* STEP 2 */}
        <div className={`step-screen${step === 2 ? ' on' : ''}`}>
          <span className="eyebrow">Step 02</span>
          <h1>Tell us what <em>you're prepping for.</em></h1>
          <p className="sub">We use this to calibrate your quiz library. Change anytime in Profile.</p>

          <div className="two-col">
            <div className="form-field">
              <label>Class / Standard</label>
              <select value={studentClass} onChange={(e) => setStudentClass(e.target.value)}>
                <option>Class 9</option><option>Class 10</option><option>Class 11</option>
                <option>Class 12</option><option>Dropper</option>
              </select>
            </div>
            <div className="form-field">
              <label>Board</label>
              <select value={board} onChange={(e) => setBoard(e.target.value)}>
                <option>CBSE</option><option>ICSE</option><option>State board</option><option>IB</option>
              </select>
            </div>
          </div>

          <div className="form-field">
            <label>What are you targeting?</label>
          </div>
          <div className="goal-grid">
            {[
              { id: 'jee-main', icon: Target, name: 'JEE Main', desc: 'PCM · Engineering' },
              { id: 'jee-adv', icon: Trophy, name: 'JEE Advanced', desc: 'Top IIT seats' },
              { id: 'neet', icon: HeartPulse, name: 'NEET', desc: 'PCB · Medical' },
              { id: 'boards', icon: BookOpen, name: 'Board exams', desc: 'Class 10 / 12' },
            ].map(({ id, icon: Icon, name, desc }) => (
              <div
                key={id}
                className={`goal${selectedGoals.includes(id) ? ' on' : ''}`}
                onClick={() => setSelectedGoals(prev =>
                  prev.includes(id)
                    ? prev.filter(g => g !== id)
                    : [...prev, id]
                )}
              >
                <div className="ico"><Icon size={16} /></div>
                <div className="text">
                  <span className="name">{name}</span>
                  <span className="desc">{desc}</span>
                </div>
                {selectedGoals.includes(id) && <span className="goal-check">✓</span>}
              </div>
            ))}
          </div>

          <div className="form-field">
            <label>School or coaching centre <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--rr-fg-dim)', fontFamily: 'var(--rr-font-sans)' }}>(optional)</span></label>
            <div className="input-shell"><School size={16} className="left" /><input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="e.g. Allen Career Institute, Kota" /></div>
          </div>

          <div className="step2-actions">
            <button className="submit-btn" onClick={handleSignup} disabled={submitting}>
              {submitting ? 'Creating account…' : 'Continue'}<ArrowRight size={16} />
            </button>
            <button className="submit-btn back-btn" onClick={() => goTo(1)}><ArrowLeft size={16} />Back</button>
          </div>
        </div>

        {/* STEP 3 */}
        <div className={`step-screen${step === 3 ? ' on' : ''}`}>
          <div className="welcome-card">
            <div className="coin">+1</div>
            <h2>Welcome{firstName ? `, ${firstName}` : ''}.</h2>
            <p>Your first token is on us. Take your first quiz today to start a streak.</p>
          </div>
          <span className="eyebrow">Step 03 · Almost there</span>
          <h1>Verify your <em>email.</em></h1>
          <p className="sub">We sent a 6-digit code to <b style={{ color: 'var(--rr-fg)' }}>{email || pendingVerification?.email}</b>. Didn't get it? <a style={{ cursor: 'pointer' }} onClick={() => toast('OTP resent!', { icon: '📧' })}>Resend</a>.</p>

          <div className="form-field" style={{ marginTop: 8 }}>
            <label>Verification code</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  style={{ padding: 0, textAlign: 'center', fontFamily: 'var(--rr-font-mono)', fontSize: 22, fontWeight: 600, height: 56, background: 'var(--rr-surface)', border: '1.5px solid var(--rr-border-strong)', borderRadius: 'var(--rr-r-md)', color: 'var(--rr-fg)', width: '100%' }}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onPaste={handleOtpPaste}
                  maxLength={1}
                  inputMode="numeric"
                />
              ))}
            </div>
          </div>

          <button className="submit-btn lime" onClick={handleVerify} disabled={submitting}>
            {submitting ? 'Verifying…' : 'Verify & enter dashboard'}<ArrowRight size={16} />
          </button>

          <p className="terms" style={{ marginTop: 16 }}>Used the wrong email? <a onClick={() => { goTo(1); }} style={{ cursor: 'pointer' }}>Go back to step 1</a></p>
        </div>

      </AuthLayout>
    </div>
  )
}
