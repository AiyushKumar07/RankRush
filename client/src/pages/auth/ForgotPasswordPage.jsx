import { useState, useCallback, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, ArrowLeft, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { authAPI } from '../../services/api'
import AuthLayout from '../../components/layouts/AuthLayout'
import './LoginPage.css'

const RESEND_COOLDOWN_SEC = 30
// Soft nudge for users who land on the OTP step but never receive a mail —
// usually because they mistyped their address (BE returns success either way
// to prevent account enumeration, so we can't tell them outright).
const NUDGE_AFTER_MS = 30_000

function ForgotRightPanel() {
  return (
    <>
      <div className="ar-top">
        <span className="eyebrow">★ Account security</span>
        <h2>Forgot your password? <em>No drama.</em> We'll mail you a code.</h2>
      </div>
      <div>
        <p className="ar-quote">
          "Reset takes thirty seconds. Your streak, rank and saved quizzes stay exactly where you left them."
        </p>
        <div className="ar-quote-author">
          <div className="av"><ShieldCheck size={18} /></div>
          <div className="info">
            <span className="name">RankRush Security</span>
            <span className="role">All active sessions are signed out after a reset</span>
          </div>
        </div>
      </div>
    </>
  )
}

export default function ForgotPasswordPage() {
  // 1 = enter email, 2 = enter OTP + new password, 3 = success
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [showNudge, setShowNudge] = useState(false)
  const otpRefs = useRef([])
  const navigate = useNavigate()

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  // Reset/start the nudge timer whenever the user (re)enters step 2 or
  // re-requests an OTP. It only fires if they haven't started typing the
  // code — typing means the mail almost certainly arrived.
  const otpTyped = otp.some((d) => d !== '')
  useEffect(() => {
    if (step !== 2 || otpTyped) {
      setShowNudge(false)
      return undefined
    }
    setShowNudge(false)
    const t = setTimeout(() => setShowNudge(true), NUDGE_AFTER_MS)
    return () => clearTimeout(t)
  }, [step, otpTyped, resendIn])

  const pwStrength = (() => {
    if (newPassword.length < 8) return 'weak'
    const hasNum = /\d/.test(newPassword)
    const hasSym = /[^a-zA-Z0-9]/.test(newPassword)
    if (newPassword.length >= 10 && hasNum && hasSym) return 'strong'
    if (newPassword.length >= 8 && (hasNum || hasSym)) return 'med'
    return 'weak'
  })()

  const requestOtp = useCallback(async (silent = false) => {
    if (!email) {
      toast.error('Enter your email first')
      return false
    }
    setSubmitting(true)
    try {
      const res = await authAPI.forgotPassword({ email })
      // Backend always returns success message to avoid email enumeration —
      // so we move forward even if the email isn't registered. The reset
      // step will surface "Invalid request" if it never existed.
      if (!silent) toast.success(res?.message || 'If that email exists, an OTP has been sent.')
      else toast('A new code was sent.', { icon: '📧' })
      setResendIn(RESEND_COOLDOWN_SEC)
      return true
    } catch (err) {
      toast.error(err?.message || 'Could not send reset code. Try again.')
      return false
    } finally {
      setSubmitting(false)
    }
  }, [email])

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    const ok = await requestOtp(false)
    if (ok) setStep(2)
  }

  const handleOtpChange = (idx, value) => {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[idx] = value
    setOtp(next)
    if (value && idx < 5) otpRefs.current[idx + 1]?.focus()
  }
  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus()
  }
  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...otp]
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || ''
    setOtp(next)
    otpRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const handleResetSubmit = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length !== 6) {
      toast.error('Enter the 6-digit code')
      return
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      await authAPI.resetPassword({ email, otp: code, newPassword })
      toast.success('Password reset. Please sign in with your new password.')
      setStep(3)
    } catch (err) {
      toast.error(err?.message || 'Invalid or expired code. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout rightPanel={<ForgotRightPanel />}>
      {step === 1 && (
        <>
          <span className="eyebrow">Account recovery</span>
          <h1>Reset your <em>password.</em></h1>
          <p className="sub">Enter the email you signed up with — we'll send a 6-digit code.</p>

          <form onSubmit={handleEmailSubmit}>
            <div className="form-field">
              <label>Email address</label>
              <div className="input-shell">
                <Mail size={16} className="left" />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <button className="submit-btn" type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset code'}<ArrowRight size={16} />
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--rr-fg-muted)', margin: '14px 0 0' }}>
            Remembered it? <Link to="/login" style={{ color: 'var(--rr-violet-500)', fontWeight: 600 }}>Back to sign in</Link>
          </p>
        </>
      )}

      {step === 2 && (
        <>
          <span className="eyebrow">Step 02 · Verify</span>
          <h1>Enter the <em>code</em> we mailed you.</h1>
          <p className="sub">
            6-digit code sent to <b style={{ color: 'var(--rr-fg)' }}>{email}</b>.{' '}
            {resendIn > 0 ? (
              <span style={{ color: 'var(--rr-fg-dim)' }}>Resend in {resendIn}s</span>
            ) : (
              <a style={{ cursor: 'pointer' }} onClick={() => requestOtp(true)}>Resend code</a>
            )}
          </p>

          <form onSubmit={handleResetSubmit}>
            {showNudge && (
              <div
                role="status"
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 12px', marginBottom: 12,
                  borderRadius: 'var(--rr-r-md)',
                  border: '1px solid color-mix(in oklab, #E8A53C 40%, var(--rr-border))',
                  background: 'color-mix(in oklab, #E8A53C 10%, var(--rr-surface))',
                  fontSize: 12, color: 'var(--rr-fg)',
                }}
              >
                <AlertCircle size={16} style={{ color: '#E8A53C', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>Didn't get a code?</div>
                  <div style={{ color: 'var(--rr-fg-muted)' }}>
                    Double-check the email is the one you registered with — and look in spam.{' '}
                    <a
                      style={{ color: 'var(--rr-violet-500)', cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']) }}
                    >
                      Use a different email
                    </a>
                  </div>
                </div>
              </div>
            )}
            <div className="form-field" style={{ marginTop: 6 }}>
              <label>Verification code</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    style={{
                      padding: 0, textAlign: 'center',
                      fontFamily: 'var(--rr-font-mono)', fontSize: 22, fontWeight: 600,
                      height: 56, background: 'var(--rr-surface)',
                      border: '1.5px solid var(--rr-border-strong)',
                      borderRadius: 'var(--rr-r-md)', color: 'var(--rr-fg)', width: '100%',
                    }}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={handleOtpPaste}
                    maxLength={1}
                    inputMode="numeric"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
            </div>

            <div className="form-field">
              <label>New password</label>
              <div className="input-shell">
                <Lock size={16} className="left" />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              {newPassword && (
                <div className="pw-hint" style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--rr-fg-dim)' }}>
                  <span>Use 10+ characters · 1 number · 1 symbol</span>
                  <span style={{ fontWeight: 600, color: pwStrength === 'strong' ? 'var(--rr-lime-500)' : pwStrength === 'med' ? '#E8A53C' : '#E5484D' }}>
                    {pwStrength === 'strong' ? 'Strong' : pwStrength === 'med' ? 'Medium' : 'Weak'}
                  </span>
                </div>
              )}
            </div>

            <div className="form-field">
              <label>Confirm new password</label>
              <div className="input-shell">
                <Lock size={16} className="left" />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button className="submit-btn" type="submit" disabled={submitting}>
              {submitting ? 'Resetting…' : 'Verify & reset password'}<ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']) }}
              style={{
                marginTop: 10, width: '100%',
                background: 'transparent', border: '1px solid var(--rr-border)',
                color: 'var(--rr-fg-muted)', borderRadius: 'var(--rr-r-md)',
                padding: '10px 14px', fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <ArrowLeft size={14} /> Use a different email
            </button>
          </form>
        </>
      )}

      {step === 3 && (
        <>
          <span className="eyebrow">Done</span>
          <h1>Password <em>reset.</em></h1>
          <p className="sub">All active sessions have been signed out. Use your new password to continue.</p>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', borderRadius: 'var(--rr-r-md)',
            border: '1px solid var(--rr-border)', background: 'var(--rr-surface)',
            margin: '8px 0 18px',
          }}>
            <KeyRound size={20} style={{ color: 'var(--rr-lime-500)' }} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--rr-fg)' }}>You're good to go</div>
              <div style={{ fontSize: 12, color: 'var(--rr-fg-muted)' }}>
                For security, the old password no longer works anywhere.
              </div>
            </div>
          </div>

          <button className="submit-btn" type="button" onClick={() => navigate('/login')}>
            Back to sign in<ArrowRight size={16} />
          </button>
        </>
      )}
    </AuthLayout>
  )
}
