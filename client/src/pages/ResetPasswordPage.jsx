import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, Eye, EyeOff, Mail, Lock, ArrowLeft, Check } from 'lucide-react';
import { authAPI } from '../services/api';
import AuthLayout from '../components/auth/AuthLayout';
import OtpInput from '../components/auth/OtpInput';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword({ email, otp, newPassword });
      toast.success('Password reset! You can now sign in.');
      navigate('/app/login', { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Reset failed. Check your code and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Reset Password" subtitle="Enter the code and your new password" icon={KeyRound}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email (if not pre-filled) */}
        {!location.state?.email && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <label className="block text-[11px] font-medium text-dark-300 mb-1.5 uppercase tracking-wider">Email</label>
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
        )}

        {/* OTP */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
          <label className="block text-[11px] font-medium text-dark-300 mb-2.5 uppercase tracking-wider text-center">
            Reset Code
          </label>
          <OtpInput length={6} onComplete={setOtp} disabled={loading} />
        </motion.div>

        {/* New Password */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
          <label className="block text-[11px] font-medium text-dark-300 mb-1.5 uppercase tracking-wider">
            New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl glass-input pl-10 pr-11 py-3 text-sm text-white placeholder-dark-500 focus:outline-none"
              placeholder="Create a new password"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-500 hover:text-accent-400 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Button type="submit" className="w-full" icon={Check} loading={loading}>
            Reset Password
          </Button>
        </motion.div>
      </form>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-5">
        <Link
          to="/app/login"
          className="flex items-center justify-center gap-1.5 text-sm text-dark-400 hover:text-dark-200 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to login
        </Link>
      </motion.div>
    </AuthLayout>
  );
}
