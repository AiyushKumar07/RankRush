import { useEffect, useRef, useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

/**
 * Theme-matched "Continue with Google" button.
 *
 * Google Identity Services renders its button inside an iframe that can't be
 * CSS-styled, so we paint our own button to match the platform theme and lay
 * the real (transparent) GSI button on top of it. Clicks land on the genuine
 * GSI button, which keeps the ID-token (JWT credential) flow our backend
 * verifies via `POST /auth/google` — no backend change required.
 *
 * Props:
 *   redirectTo   – path to navigate to after a successful sign-in (default /app)
 *   referralCode – optional referral code to attach to a brand-new account
 */
export default function GoogleAuthButton({ redirectTo = '/app', referralCode }) {
  const { googleLogin } = useAuth()
  const navigate = useNavigate()
  const wrapRef = useRef(null)
  // GSI's `width` must be a pixel number (Google caps it at 400). Track the
  // wrapper's width so the transparent button always covers our themed one.
  const [gsiWidth, setGsiWidth] = useState(360)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setGsiWidth(Math.min(400, Math.round(el.offsetWidth)))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleSuccess = async (credentialResponse) => {
    const idToken = credentialResponse?.credential
    if (!idToken) {
      toast.error('Google sign-in failed. Please try again.')
      return
    }
    try {
      const userData = await googleLogin(idToken, 'STUDENT', referralCode)
      // First-time Google accounts aren't onboarded yet — send them to profile
      // setup; returning users go straight where they intended.
      if (userData && !userData.isOnboarded) {
        navigate('/onboarding')
      } else {
        toast.success('Welcome to RankRush!')
        navigate(redirectTo)
      }
    } catch (err) {
      toast.error(err?.message || 'Could not sign in with Google')
    }
  }

  return (
    <div className="google-auth-btn" ref={wrapRef}>
      {/* Visible, theme-matched button (decorative — the GSI button handles input) */}
      <button type="button" className="google-btn-themed" tabIndex={-1} aria-hidden="true">
        <GoogleIcon />
        <span>Continue with Google</span>
      </button>

      {/* Real GSI button, transparent and overlaid to capture the click */}
      <div className="gsi-overlay">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => toast.error('Google sign-in was cancelled or failed')}
          theme="outline"
          size="large"
          text="continue_with"
          shape="rectangular"
          width={gsiWidth}
          useOneTap={false}
        />
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
