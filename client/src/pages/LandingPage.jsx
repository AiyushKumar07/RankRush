import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import {
  Trophy, BookOpen, Brain, Users, Rocket, ArrowRight,
  Star, Target, TrendingUp, Award, Clock, ChevronRight,
  GraduationCap, BarChart3, FileText, Sparkles, CheckCircle2,
} from 'lucide-react';
import logo from '../assets/logo.png';

const MotionLink = motion(Link);

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

function AuthCTA() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto"
    >
      <MotionLink
        to="/signup"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-accent-500/25 hover:shadow-accent-500/40 transition-shadow"
      >
        <Rocket className="h-4 w-4" />
        Create Free Account
      </MotionLink>
      <MotionLink
        to="/login"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="w-full sm:w-auto px-7 py-3.5 rounded-xl glass-frosted hover:border-accent-500/20 text-dark-100 hover:text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all"
      >
        Login
        <ArrowRight className="h-4 w-4" />
      </MotionLink>
    </motion.div>
  );
}

export default function LandingPage() {
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
          <img src={logo} alt="RankRush" className="h-8 w-auto" />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="px-4 py-2 rounded-lg text-sm font-medium text-dark-200 hover:text-white transition-colors"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-semibold shadow-lg shadow-accent-500/20 hover:shadow-accent-500/40 transition-shadow"
          >
            Sign Up
          </Link>
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
          <motion.img
            src={logo}
            alt="RankRush"
            className="relative h-16 sm:h-20 w-auto drop-shadow-2xl"
            animate={{ rotate: [0, 2, -2, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-4"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-xs font-medium text-emerald-300 border border-emerald-500/30">
            <motion.span
              className="relative flex h-2 w-2"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            >
              <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-60 animate-ping" />
              <span className="relative rounded-full h-2 w-2 bg-emerald-400" />
            </motion.span>
            Live Now — Open for Students
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
          className="text-base sm:text-lg text-dark-300 max-w-xl mb-8 leading-relaxed"
        >
          The platform for students to attempt quizzes, compete on leaderboards,
          access study materials, and accelerate their academic journey — all in
          one place. Sign up free and start ranking today.
        </motion.p>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-dark-300 mb-10"
        >
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Free to join
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            No credit card
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Instant access
          </span>
        </motion.div>

        <AuthCTA />
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
              Why RankRush
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything You Need to{' '}
              <span className="gradient-text">Excel</span>
            </h2>
            <p className="text-dark-300 max-w-lg mx-auto">
              Built by students, for students. A complete ecosystem to help you prepare
              smarter, practice harder, and rank higher — available today.
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
                Create your free RankRush account in seconds — attempt quizzes,
                climb the leaderboard, and track your progress from day one.
              </p>

              <AuthCTA />

              <p className="text-xs text-dark-400 mt-5">
                Already have an account?{' '}
                <Link to="/login" className="text-accent-300 hover:text-accent-200 font-medium">
                  Log in here
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-dark-700/50 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="RankRush" className="h-5 w-auto" />
          </div>
          <p className="text-xs text-dark-500">
            &copy; {new Date().getFullYear()} RankRush. Helping students rank higher.
          </p>
        </div>
      </footer>
    </div>
  );
}
