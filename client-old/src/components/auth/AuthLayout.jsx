import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';

function Particles() {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.5,
    dur: Math.random() * 20 + 15,
    del: Math.random() * 5,
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
            opacity: [0.15, 0.5, 0.2, 0.6, 0.15],
          }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.del, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-dark-950 overflow-hidden p-4">
      {/* Background orbs */}
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

      <Particles />
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

      {/* Corner accents */}
      <motion.div
        className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-accent-500/20 rounded-tl-2xl pointer-events-none"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-neon-cyan/20 rounded-br-2xl pointer-events-none"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, delay: 2 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[440px]"
        style={{ perspective: '1200px' }}
      >
        <div className="relative glass-card rounded-3xl p-8 glow-accent inner-shine overflow-hidden">
          {/* Scanning line */}
          <motion.div
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-400/40 to-transparent pointer-events-none"
            animate={{ top: ['0%', '100%'] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />

          {/* Animated border */}
          <motion.div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            animate={{
              boxShadow: [
                'inset 0 0 0 1px rgba(124,107,245,0.1)',
                'inset 0 0 0 1px rgba(0,232,198,0.15)',
                'inset 0 0 0 1px rgba(196,113,245,0.12)',
                'inset 0 0 0 1px rgba(124,107,245,0.1)',
              ],
            }}
            transition={{ duration: 6, repeat: Infinity }}
          />

          {/* Top shine */}
          <motion.div
            className="absolute top-0 h-px bg-gradient-to-r from-transparent via-accent-400/30 to-transparent"
            animate={{ left: ['-30%', '100%'], right: ['100%', '-30%'] }}
            transition={{ duration: 4, repeat: Infinity }}
          />

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col items-center mb-6"
          >
            <Link to="/" className="flex flex-col items-center">
              <motion.img
                src={logo}
                alt="RankRush"
                className="h-12 w-auto mb-1"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 400 }}
              />
            </Link>
            {title && <h2 className="text-lg font-semibold text-white mt-3">{title}</h2>}
            {subtitle && <p className="text-sm text-dark-400 mt-1 text-center">{subtitle}</p>}
          </motion.div>

          {children}
        </div>
      </motion.div>
    </div>
  );
}
