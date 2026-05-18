import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import { authAPI } from '../services/api';
import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSent(true);
      toast.success('If an account exists, a reset code has been sent.');
    } catch (err) {
      toast.error(err?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleContinue() {
    navigate('/reset-password', { state: { email } });
  }

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle={sent ? `Check ${email} for a reset code` : 'Enter your email to reset your password'}
      icon={KeyRound}
    >
      {!sent ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <label className="block text-[11px] font-medium text-dark-300 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl glass-input pl-10 pr-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none"
                placeholder="your@email.com"
                required
              />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Button type="submit" className="w-full" icon={ArrowRight} loading={loading}>
              Send Reset Code
            </Button>
          </motion.div>
        </form>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="inline-flex p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-3"
            >
              <Mail className="h-8 w-8 text-emerald-400" />
            </motion.div>
            <p className="text-sm text-dark-300 mt-2">
              A 6-digit code has been sent to your email. Enter it on the next page to set a new password.
            </p>
          </div>

          <Button className="w-full" icon={ArrowRight} onClick={handleContinue}>
            Enter Reset Code
          </Button>

          <button
            type="button"
            onClick={() => setSent(false)}
            className="w-full text-sm text-dark-400 hover:text-dark-200 transition-colors"
          >
            Didn't receive it? Try again
          </button>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-5">
        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-dark-400 hover:text-dark-200 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to login
        </Link>
      </motion.div>
    </AuthLayout>
  );
}
