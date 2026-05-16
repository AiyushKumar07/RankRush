import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { label: 'Super Admin', email: 'admin@rankrush.io', password: 'Admin@1234' },
    { label: 'Reviewer', email: 'reviewer@rankrush.io', password: 'Reviewer@1234' },
    { label: 'Moderator', email: 'moderator@rankrush.io', password: 'Moderator@1234' },
    { label: 'Publisher', email: 'publisher@rankrush.io', password: 'Publisher@1234' },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-950 grid-bg p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        <div className="glass-card rounded-3xl p-8 glow-accent">
          <div className="flex flex-col items-center mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/20 mb-4">
              <Zap className="h-7 w-7 text-accent-400" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">RankRush</h1>
            <p className="text-sm text-dark-400 mt-1">Biology Quiz Bank Admin Panel</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-dark-600/50 bg-dark-800/50 px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:border-accent-500/50 focus:outline-none focus:ring-1 focus:ring-accent-500/30 transition-all"
                placeholder="admin@rankrush.io"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-dark-600/50 bg-dark-800/50 px-4 py-2.5 pr-10 text-sm text-white placeholder-dark-500 focus:border-accent-500/50 focus:outline-none focus:ring-1 focus:ring-accent-500/30 transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              icon={LogIn}
              loading={loading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6">
            <p className="text-center text-[11px] text-dark-500 mb-3 uppercase tracking-wider">
              Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.password);
                  }}
                  className="rounded-lg border border-dark-600/30 bg-dark-800/30 px-3 py-2 text-left hover:border-accent-500/30 transition-colors group"
                >
                  <p className="text-xs font-medium text-dark-200 group-hover:text-accent-400 transition-colors">
                    {acc.label}
                  </p>
                  <p className="text-[10px] text-dark-500 truncate">{acc.email}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
