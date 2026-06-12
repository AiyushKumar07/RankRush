import { GoogleLogin } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

/**
 * Renders Google's official Identity Services button. On success it ships the
 * returned ID-token credential to the backend (`POST /auth/google`), which
 * finds-or-creates a STUDENT account and returns our normal session tokens.
 *
 * Props:
 *   redirectTo   – path to navigate to after a successful sign-in (default /app)
 *   referralCode – optional referral code to attach to a brand-new account
 */
export default function GoogleAuthButton({ redirectTo = '/app', referralCode }) {
  const { googleLogin } = useAuth()
  const navigate = useNavigate()

  const handleSuccess = async (credentialResponse) => {
    const idToken = credentialResponse?.credential
    if (!idToken) {
      toast.error('Google sign-in failed. Please try again.')
      return
    }
    try {
      await googleLogin(idToken, 'STUDENT', referralCode)
      toast.success('Welcome to RankRush!')
      navigate(redirectTo)
    } catch (err) {
      toast.error(err?.message || 'Could not sign in with Google')
    }
  }

  return (
    <div className="google-auth-btn">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => toast.error('Google sign-in was cancelled or failed')}
        theme="outline"
        size="large"
        text="continue_with"
        shape="rectangular"
        width="320"
        useOneTap={false}
      />
    </div>
  )
}
