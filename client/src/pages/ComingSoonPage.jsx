import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import {
  Zap, Trophy, BookOpen, Brain, Users, Rocket, ArrowRight,
  Star, Target, TrendingUp, Award, Clock, ChevronRight,
  GraduationCap, BarChart3, FileText, Sparkles, Bell,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Brain,
    title: 'Smart Quizzes',
    desc: 'AI-powered quizzes that adapt to your skill level in real time',
    color: 'from-accent-500 to-accent-700',
    glow: 'rgba(124,107,245,0.3)',
  },
  {
    icon: Trophy,
    title: 'Live Leaderboards',
    desc: 'Compete with students across the globe and climb the ranks',
    color: 'from-amber-400 to-orange-500',
    glow: 'rgba(251,191,36,0.3)',
  },
  {
    icon: BookOpen,
    title: 'Study Materials',
    desc: 'Curated notes, guides, and resources for every subject',
    color: 'from-neon-cyan to-emerald-500',
    glow: 'rgba(0,232,198,0.3)',
  },
  {
    icon: BarChart3,
    title: 'Performance Analytics',
    desc: 'Track your progress with detailed stats and insights',
    color: 'from-neon-blue to-blue-600',
    glow: 'rgba(56,189,248,0.3)',
  },
  {
    icon: FileText,
    title: 'Practice Papers',
    desc: 'Previous year papers and mock tests at your fingertips',
    color: 'from-neon-pink to-rose-600',
    glow: 'rgba(255,94,158,0.3)',
  },
  {
    icon: Users,
    title: 'Study Groups',
    desc: 'Collaborate, discuss, and learn with your peers',
    color: 'from-neon-purple to-violet-600',
    glow: 'rgba(196,113,245,0.3)',
  },
];

const STATS = [
  { value: '10K+', label: 'Questions', icon: Target },
  { value: '50+', label: 'Subjects', icon: BookOpen },
  { value: '∞', label: 'Attempts', icon: TrendingUp },
  { value: '24/7', label: 'Access', icon: Clock },
];

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <motion.div
        animate={{ x: [0, 60, -30, 0], y: [0, -40, 30, 0], scale: [1, 1.15, 0.9, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[5%] left-[10%] w-[600px] h-[600px] rounded-full bg-accent-500/[0.06] blur-[150px]"
      />
      <motion.div
        animate={{ x: [0, -50, 30, 0], y: [0, 50, -30, 0], scale: [1, 0.9, 1.12, 1] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[5%] right-[5%] w-[500px] h-[500px] rounded-full bg-neon-cyan/[0.05] blur-[130px]"
      />
      <motion.div
        animate={{ x: [0, 30, -40, 0], y: [0, -30, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[40%] right-[20%] w-[400px] h-[400px] rounded-full bg-neon-purple/[0.04] blur-[120px]"
      />
      <motion.div
        animate={{ x: [0, -20, 40, 0], y: [0, 30, -20, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[60%] left-[30%] w-[350px] h-[350px] rounded-full bg-neon-pink/[0.03] blur-[110px]"
      />
      <div className="absolute inset-0 grid-bg opacity-30" />
    </div>
  );
}

function FloatingIcons() {
  const icons = [
    { Icon: Star, x: '8%', y: '15%', delay: 0, size: 18 },
    { Icon: Award, x: '85%', y: '12%', delay: 1.5, size: 20 },
    { Icon: GraduationCap, x: '90%', y: '55%', delay: 3, size: 22 },
    { Icon: Sparkles, x: '5%', y: '65%', delay: 2, size: 16 },
    { Icon: Rocket, x: '75%', y: '80%', delay: 4, size: 18 },
    { Icon: Trophy, x: '15%', y: '85%', delay: 1, size: 20 },
    { Icon: Brain, x: '92%', y: '35%', delay: 2.5, size: 16 },
    { Icon: Target, x: '3%', y: '40%', delay: 3.5, size: 14 },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {icons.map(({ Icon, x, y, delay, size }, i) => (
        <motion.div
          key={i}
          className="absolute text-dark-500/40"
          style={{ left: x, top: y }}
          animate={{
            y: [0, -20, 10, -15, 0],
            x: [0, 8, -8, 5, 0],
            rotate: [0, 10, -10, 5, 0],
            opacity: [0.15, 0.4, 0.2, 0.35, 0.15],
          }}
          transition={{ duration: 12 + i * 2, repeat: Infinity, delay, ease: 'easeInOut' }}
        >
          <Icon size={size} />
        </motion.div>
      ))}
    </div>
  );
}

function Particles() {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.5,
    dur: Math.random() * 25 + 15,
    del: Math.random() * 8,
    color: i % 3 === 0 ? 'bg-accent-400/25' : i % 3 === 1 ? 'bg-neon-cyan/20' : 'bg-neon-purple/15',
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${p.color}`}
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{
            y: [0, -40, 20, -30, 0],
            x: [0, 15, -15, 8, 0],
            opacity: [0.1, 0.5, 0.2, 0.6, 0.1],
          }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.del, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function CountdownUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="glass-card rounded-2xl w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={value}
              initial={{ y: 20, opacity: 0, filter: 'blur(4px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              exit={{ y: -20, opacity: 0, filter: 'blur(4px)' }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="text-2xl sm:text-3xl font-bold gradient-text"
            >
              {String(value).padStart(2, '0')}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
      <span className="text-[10px] sm:text-xs text-dark-400 mt-2 uppercase tracking-widest font-medium">
        {label}
      </span>
    </div>
  );
}

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date().getTime();
      const diff = targetDate - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

function FeatureCard({ feature, index }) {
  const ref = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-6, 6]);

  function handleMouse(e) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  const { icon: Icon, title, desc, color, glow } = feature;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 800 }}
      className="group relative"
    >
      <div className="glass-card rounded-2xl p-6 h-full transition-all duration-500 relative overflow-hidden">
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
          style={{ background: `radial-gradient(circle at 50% 50%, ${glow}, transparent 70%)` }}
        />

        <div className="relative z-10">
          <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${color} mb-4 shadow-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-sm text-dark-300 leading-relaxed">{desc}</p>
        </div>

        <motion.div
          className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ChevronRight className="h-4 w-4 text-dark-400" />
        </motion.div>
      </div>
    </motion.div>
  );
}

function EmailSignup() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || loading) return;
    setError('');
    setLoading(true);
    try {
      const { authAPI } = await import('../services/api.js');
      await authAPI.studentSignup({ email });
      setSubmitted(true);
      setEmail('');
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      const msg = err?.message || err?.data?.message || 'Something went wrong. Try again.';
      setError(msg);
      setTimeout(() => setError(''), 4000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="relative max-w-md mx-auto"
    >
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email for early access"
            className="w-full rounded-xl glass-input px-4 py-3.5 text-sm text-white placeholder-dark-500 focus:outline-none disabled:opacity-50"
            required
            disabled={loading || submitted}
          />
        </div>
        <motion.button
          type="submit"
          disabled={loading || submitted}
          whileHover={!loading && !submitted ? { scale: 1.02 } : {}}
          whileTap={!loading && !submitted ? { scale: 0.98 } : {}}
          className="shrink-0 px-5 py-3.5 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-accent-500/25 hover:shadow-accent-500/40 transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.span
                key="done"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5"
              >
                <Sparkles className="h-4 w-4" />
                Joined!
              </motion.span>
            ) : loading ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                />
                Signing up...
              </motion.span>
            ) : (
              <motion.span
                key="notify"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5"
              >
                <Bell className="h-4 w-4" />
                Notify Me
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-2 text-xs text-neon-pink text-center"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.form>
  );
}

const LAUNCH_TARGET = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 45);
  return d.getTime();
})();

export default function ComingSoonPage() {
  const countdown = useCountdown(LAUNCH_TARGET);

  return (
    <div className="relative min-h-screen bg-dark-950 overflow-x-hidden">
      <AnimatedBackground />
      <Particles />
      <FloatingIcons />

      {/* Navbar */}
      <motion.nav
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-5"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500/30 to-accent-700/30 border border-accent-400/20">
            <Zap className="h-5 w-5 text-accent-300" />
          </div>
          <span className="text-xl font-bold gradient-text">RankRush</span>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-12 sm:pt-20 pb-16">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="relative mb-8"
        >
          <div className="absolute inset-0 rounded-3xl bg-accent-500/20 blur-2xl animate-pulse-glow scale-150" />
          <motion.div
            className="absolute -inset-5 rounded-3xl border border-accent-400/10"
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            style={{ borderStyle: 'dashed' }}
          />
          <motion.div
            className="absolute -inset-10 rounded-3xl border border-neon-cyan/5"
            animate={{ rotate: -360 }}
            transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
            style={{ borderStyle: 'dashed' }}
          />
          <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-accent-500/30 to-accent-700/30 border border-accent-400/20 shadow-2xl shadow-accent-500/20">
            <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 5, repeat: Infinity }}>
              <Zap className="h-10 w-10 sm:h-12 sm:w-12 text-accent-300" />
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-4"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-xs font-medium text-accent-300 border border-accent-500/20">
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Rocket className="h-3.5 w-3.5" />
            </motion.span>
            Launching Soon for Students
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] max-w-4xl mb-6"
        >
          <span className="text-white">Level Up Your</span>
          <br />
          <span
            className="gradient-text animate-text-shimmer inline-block"
            style={{ backgroundSize: '300% 100%' }}
          >
            Learning Game
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-base sm:text-lg text-dark-300 max-w-xl mb-10 leading-relaxed"
        >
          The ultimate platform for students to attempt quizzes, compete on
          leaderboards, access study materials, and accelerate their academic journey.
        </motion.p>

        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex items-center gap-3 sm:gap-5 mb-12"
        >
          <CountdownUnit value={countdown.days} label="Days" />
          <span className="text-xl text-dark-500 font-light mt-[-20px]">:</span>
          <CountdownUnit value={countdown.hours} label="Hours" />
          <span className="text-xl text-dark-500 font-light mt-[-20px]">:</span>
          <CountdownUnit value={countdown.minutes} label="Mins" />
          <span className="text-xl text-dark-500 font-light mt-[-20px]">:</span>
          <CountdownUnit value={countdown.seconds} label="Secs" />
        </motion.div>

        <EmailSignup />
      </section>

      {/* Stats */}
      <section className="relative z-10 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STATS.map(({ value, label, icon: Icon }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="glass-card rounded-2xl p-5 text-center group hover-lift"
              >
                <Icon className="h-5 w-5 text-accent-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-2xl sm:text-3xl font-bold gradient-text mb-1">{value}</div>
                <div className="text-xs text-dark-400 uppercase tracking-wider">{label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-16 sm:py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-accent-300 mb-4">
              <Sparkles className="h-3 w-3" />
              What&apos;s Coming
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything You Need to{' '}
              <span className="gradient-text">Excel</span>
            </h2>
            <p className="text-dark-300 max-w-lg mx-auto">
              Built by students, for students. A complete ecosystem to help you prepare
              smarter, practice harder, and rank higher.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} feature={f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-16 sm:py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="glass-card rounded-3xl p-8 sm:p-12 relative overflow-hidden">
            <motion.div
              className="absolute inset-0 opacity-30"
              style={{
                background: 'radial-gradient(ellipse at 50% 0%, rgba(124,107,245,0.15) 0%, transparent 60%)',
              }}
            />

            <div className="relative z-10">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-accent-500/20 to-neon-cyan/10 border border-accent-400/10 mb-6"
              >
                <GraduationCap className="h-8 w-8 text-accent-300" />
              </motion.div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Ready to Rush the Ranks?
              </h2>
              <p className="text-dark-300 mb-8 max-w-md mx-auto">
                Be among the first students to experience RankRush. Drop your email
                and we&apos;ll notify you the moment we launch.
              </p>

              <EmailSignup />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-dark-700/50 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent-400" />
            <span className="text-sm font-semibold gradient-text">RankRush</span>
          </div>
          <p className="text-xs text-dark-500">
            &copy; {new Date().getFullYear()} RankRush. Building the future of student learning.
          </p>
        </div>
      </footer>
    </div>
  );
}
