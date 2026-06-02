import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

export default function StudentLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password, 'STUDENT');
      if (result?.requiresVerification) {
        toast('Email not verified. Please enter the OTP sent to your email.', { icon: '📧' });
        navigate('/verify-email');
        return;
      }
      toast.success('Welcome back!');
      if (!result.isOnboarded) {
        navigate('/app/onboarding');
      } else {
        navigate('/app/dashboard');
      }
    } catch (err) {
      toast.error(err?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to continue learning" icon={LogIn}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <label className="block text-[11px] font-medium text-dark-300 mb-1.5 uppercase tracking-wider">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              className="w-full rounded-xl glass-input pl-10 pr-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none"
              placeholder="your@email.com"
              required
            />
            {focusedField === 'email' && (
              <motion.div
                layoutId="loginFocus"
                className="absolute inset-0 rounded-xl border border-accent-400/30 pointer-events-none"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-medium text-dark-300 uppercase tracking-wider">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-[11px] text-accent-400 hover:text-accent-300 font-medium transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              className="w-full rounded-xl glass-input pl-10 pr-11 py-3 text-sm text-white placeholder-dark-500 focus:outline-none"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-500 hover:text-accent-400 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {focusedField === 'password' && (
              <motion.div
                layoutId="loginFocus"
                className="absolute inset-0 rounded-xl border border-accent-400/30 pointer-events-none"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Button type="submit" className="w-full" icon={LogIn} loading={loading}>
            Sign In
          </Button>
        </motion.div>
      </form>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-5 text-center">
        <p className="text-sm text-dark-400">
          Don't have an account?{' '}
          <Link to="/app/signup" className="text-accent-400 hover:text-accent-300 font-medium transition-colors">
            Sign up
          </Link>
        </p>
      </motion.div>
    </AuthLayout>
  );
}
