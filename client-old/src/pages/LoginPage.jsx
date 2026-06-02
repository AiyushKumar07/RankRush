import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Eye, EyeOff, Shield, Lock } from 'lucide-react';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

function FloatingParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-accent-400/20"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{
            y: [0, -30, 10, -20, 0],
            x: [0, 10, -10, 5, 0],
            opacity: [0.2, 0.6, 0.3, 0.7, 0.2],
          }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function OrbitingDots() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
          style={{
            background: i % 2 === 0 ? 'rgba(124,107,245,0.6)' : 'rgba(0,232,198,0.5)',
            boxShadow: i % 2 === 0 ? '0 0 6px rgba(124,107,245,0.4)' : '0 0 6px rgba(0,232,198,0.4)',
          }}
          animate={{
            x: [Math.cos((i * Math.PI) / 3) * 220, Math.cos((i * Math.PI) / 3 + Math.PI) * 220],
            y: [Math.sin((i * Math.PI) / 3) * 220, Math.sin((i * Math.PI) / 3 + Math.PI) * 220],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{ duration: 12 + i * 2, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  );
}

function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-400/40 to-transparent pointer-events-none"
      animate={{ top: ['0%', '100%'] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
    />
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password, 'ADMIN');
      if (result?.requiresVerification) {
        toast('Please verify your email first.', { icon: '📧' });
        navigate('/verify-email');
        return;
      }
      toast.success('Welcome back!');
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-dark-950 overflow-hidden p-4">
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.9, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[15%] left-[20%] w-[500px] h-[500px] rounded-full bg-accent-500/[0.07] blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -30, 20, 0], y: [0, 40, -20, 0], scale: [1, 0.95, 1.08, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[10%] right-[15%] w-[400px] h-[400px] rounded-full bg-neon-cyan/[0.05] blur-[100px]"
        />
        <motion.div
          animate={{ x: [0, 20, -30, 0], y: [0, -20, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[50%] right-[30%] w-[300px] h-[300px] rounded-full bg-neon-purple/[0.04] blur-[100px]"
        />
      </div>

      {/* Floating particles */}
      <FloatingParticles />

      {/* Orbiting dots around center */}
      <OrbitingDots />

      {/* Grid overlay */}
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

      {/* Animated corner accents */}
      <motion.div
        className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-accent-500/20 rounded-tl-2xl pointer-events-none"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-neon-cyan/20 rounded-br-2xl pointer-events-none"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[420px]"
        style={{ perspective: '1200px' }}
      >
        {/* Main glass card */}
        <div className="relative glass-card rounded-3xl p-8 glow-accent inner-shine overflow-hidden">
          {/* Scanning line across card */}
          <ScanLine />

          {/* Animated border glow */}
          <motion.div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{ padding: '1px' }}
            animate={{
              boxShadow: [
                'inset 0 0 0 1px rgba(124,107,245,0.1)',
                'inset 0 0 0 1px rgba(0,232,198,0.15)',
                'inset 0 0 0 1px rgba(196,113,245,0.12)',
                'inset 0 0 0 1px rgba(124,107,245,0.1)',
              ],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Top edge shine */}
          <motion.div
            className="absolute top-0 h-px bg-gradient-to-r from-transparent via-accent-400/30 to-transparent"
            animate={{ left: ['-30%', '100%'], right: ['100%', '-30%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col items-center mb-8"
          >
            <motion.img
              src={logo}
              alt="RankRush"
              className="h-14 w-auto mb-3"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400 }}
            />
            <motion.p
              className="text-sm text-dark-400 mt-1.5 flex items-center gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Shield className="h-3 w-3" />
              </motion.span>
              Quiz Bank Admin Panel
            </motion.p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-xs font-medium text-dark-300 mb-2 uppercase tracking-wider">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full rounded-xl glass-input px-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none transition-all"
                  placeholder="admin@rankrush.io"
                  required
                />
                {focusedField === 'email' && (
                  <motion.div
                    layoutId="inputFocus"
                    className="absolute inset-0 rounded-xl border border-accent-400/30 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-xs font-medium text-dark-300 mb-2 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full rounded-xl glass-input px-4 py-3 pr-11 text-sm text-white placeholder-dark-500 focus:outline-none transition-all"
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
                    layoutId="inputFocus"
                    className="absolute inset-0 rounded-xl border border-accent-400/30 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                type="submit"
                className="w-full"
                icon={LogIn}
                loading={loading}
              >
                Sign In
              </Button>
            </motion.div>
          </form>

          {/* Security footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 flex items-center justify-center gap-2"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Lock className="h-3 w-3 text-dark-500" />
            </motion.div>
            <p className="text-[11px] text-dark-500">Secured with end-to-end encryption</p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
