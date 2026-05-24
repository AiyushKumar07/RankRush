import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Eye, EyeOff, Mail, User, Lock, ArrowRight, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

function PasswordStrength({ password }) {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
    { label: 'Special character', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const strength = passed <= 2 ? 'Weak' : passed <= 3 ? 'Fair' : passed <= 4 ? 'Good' : 'Strong';
  const color = passed <= 2 ? 'bg-red-400' : passed <= 3 ? 'bg-amber-400' : passed <= 4 ? 'bg-emerald-400' : 'bg-neon-cyan';

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-2 space-y-2"
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-dark-700 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${color}`}
            initial={{ width: 0 }}
            animate={{ width: `${(passed / 5) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-[10px] text-dark-400 uppercase tracking-wider w-12 text-right">{strength}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            {c.ok ? (
              <Check className="h-3 w-3 text-emerald-400 shrink-0" />
            ) : (
              <X className="h-3 w-3 text-dark-500 shrink-0" />
            )}
            <span className={`text-[11px] ${c.ok ? 'text-dark-200' : 'text-dark-500'}`}>{c.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function StudentSignupPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const { studentSignup } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await studentSignup(form);
      toast.success('Account created! Check your email for the verification code.');
      navigate('/verify-email');
    } catch (err) {
      const msg = err?.message || err?.errors?.[0] || 'Signup failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    {
      id: 'firstName',
      label: 'First Name',
      icon: User,
      type: 'text',
      placeholder: 'John',
      half: true,
    },
    {
      id: 'lastName',
      label: 'Last Name',
      icon: User,
      type: 'text',
      placeholder: 'Doe',
      half: true,
    },
    {
      id: 'email',
      label: 'Email',
      icon: Mail,
      type: 'email',
      placeholder: 'john@example.com',
    },
  ];

  return (
    <AuthLayout title="Create Account" subtitle="Start your learning journey today" icon={UserPlus}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          {fields.filter((f) => f.half).map((field, i) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <label className="block text-[11px] font-medium text-dark-300 mb-1.5 uppercase tracking-wider">
                {field.label}
              </label>
              <div className="relative">
                <input
                  type={field.type}
                  value={form[field.id]}
                  onChange={(e) => update(field.id, e.target.value)}
                  onFocus={() => setFocusedField(field.id)}
                  onBlur={() => setFocusedField(null)}
                  className="w-full rounded-xl glass-input px-3.5 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none"
                  placeholder={field.placeholder}
                  required
                />
                {focusedField === field.id && (
                  <motion.div
                    layoutId="signupFocus"
                    className="absolute inset-0 rounded-xl border border-accent-400/30 pointer-events-none"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Email */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
          <label className="block text-[11px] font-medium text-dark-300 mb-1.5 uppercase tracking-wider">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              className="w-full rounded-xl glass-input pl-10 pr-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none"
              placeholder="john@example.com"
              required
            />
            {focusedField === 'email' && (
              <motion.div
                layoutId="signupFocus"
                className="absolute inset-0 rounded-xl border border-accent-400/30 pointer-events-none"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </div>
        </motion.div>

        {/* Password */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
          <label className="block text-[11px] font-medium text-dark-300 mb-1.5 uppercase tracking-wider">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              className="w-full rounded-xl glass-input pl-10 pr-11 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none"
              placeholder="Create a strong password"
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
            {focusedField === 'password' && (
              <motion.div
                layoutId="signupFocus"
                className="absolute inset-0 rounded-xl border border-accent-400/30 pointer-events-none"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </div>
          <PasswordStrength password={form.password} />
        </motion.div>

        {/* Referral Code (Optional) */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.65 }}>
          <label className="block text-[11px] font-medium text-dark-300 mb-1.5 uppercase tracking-wider">Referral Code (Optional)</label>
          <div className="relative">
            <UserPlus className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
            <input
              type="text"
              value={form.referralCode || ''}
              onChange={(e) => update('referralCode', e.target.value)}
              onFocus={() => setFocusedField('referralCode')}
              onBlur={() => setFocusedField(null)}
              className="w-full rounded-xl glass-input pl-10 pr-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none"
              placeholder="RR-XXXXXX"
            />
            {focusedField === 'referralCode' && (
              <motion.div
                layoutId="signupFocus"
                className="absolute inset-0 rounded-xl border border-accent-400/30 pointer-events-none"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Button type="submit" className="w-full" icon={ArrowRight} loading={loading}>
            Create Account
          </Button>
        </motion.div>
      </form>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-5 text-center">
        <p className="text-sm text-dark-400">
          Already have an account?{' '}
          <Link to="/app/login" className="text-accent-400 hover:text-accent-300 font-medium transition-colors">
            Log in
          </Link>
        </p>
      </motion.div>
    </AuthLayout>
  );
}
