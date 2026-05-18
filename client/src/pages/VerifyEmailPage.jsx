import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, RotateCw, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import AuthLayout from '../components/auth/AuthLayout';
import OtpInput from '../components/auth/OtpInput';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const { pendingVerification, verifyEmail, clearPendingVerification } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!pendingVerification) {
      navigate('/signup', { replace: true });
    }
  }, [pendingVerification, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function handleComplete(code) {
    if (loading || !pendingVerification) return;
    setLoading(true);
    try {
      const user = await verifyEmail(pendingVerification.userId, code);
      toast.success('Email verified!');
      if (!user.isOnboarded) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      toast.error(err?.message || 'Invalid or expired code. Please try again.');
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resending || resendCooldown > 0 || !pendingVerification) return;
    setResending(true);
    try {
      await authAPI.resendOtp({ email: pendingVerification.email });
      toast.success('New code sent!');
      setResendCooldown(60);
    } catch (err) {
      toast.error(err?.message || 'Could not resend code. Try again later.');
    } finally {
      setResending(false);
    }
  }

  function handleBack() {
    clearPendingVerification();
    navigate('/signup');
  }

  if (!pendingVerification) return null;

  return (
    <AuthLayout
      title="Verify Your Email"
      subtitle={`We sent a 6-digit code to ${pendingVerification.email}`}
      icon={ShieldCheck}
    >
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <OtpInput length={6} onComplete={handleComplete} disabled={loading} />
        </motion.div>

        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="h-4 w-4 border-2 border-accent-400/30 border-t-accent-400 rounded-full"
              />
              <span className="text-sm text-dark-300">Verifying...</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center space-y-3"
        >
          <p className="text-sm text-dark-400">Didn't receive the code?</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-400 hover:text-accent-300 transition-colors disabled:text-dark-500 disabled:cursor-not-allowed"
          >
            <RotateCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : resending
                ? 'Sending...'
                : 'Resend Code'}
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <Button variant="ghost" className="w-full" icon={ArrowLeft} onClick={handleBack}>
            Back to Signup
          </Button>
        </motion.div>
      </div>
    </AuthLayout>
  );
}
