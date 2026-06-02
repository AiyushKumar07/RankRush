import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

function AnimatedCounter({ value }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = typeof value === 'number' ? value : 0;
    const controls = animate(count, target, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1],
    });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [value, count, rounded]);

  return <span>{display}</span>;
}

export default function StatCard({ icon: Icon, label, value, trend, color = 'accent', active = false, onClick }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);

  const colorMap = {
    accent: { gradient: 'from-accent-500/25 to-accent-600/10', text: 'text-accent-400', glow: 'rgba(124,107,245,0.3)', ring: 'ring-accent-500/50', activeBg: 'bg-accent-500', activeGlow: 'rgba(124,107,245,0.5)', badgeBg: 'bg-accent-500/20', badgeText: 'text-accent-300', badgeBorder: 'border-accent-500/30' },
    cyan: { gradient: 'from-neon-cyan/25 to-neon-cyan/10', text: 'text-neon-cyan', glow: 'rgba(0,232,198,0.3)', ring: 'ring-neon-cyan/50', activeBg: 'bg-neon-cyan', activeGlow: 'rgba(0,232,198,0.5)', badgeBg: 'bg-neon-cyan/20', badgeText: 'text-neon-cyan', badgeBorder: 'border-neon-cyan/30' },
    purple: { gradient: 'from-neon-purple/25 to-neon-purple/10', text: 'text-neon-purple', glow: 'rgba(196,113,245,0.3)', ring: 'ring-neon-purple/50', activeBg: 'bg-neon-purple', activeGlow: 'rgba(196,113,245,0.5)', badgeBg: 'bg-neon-purple/20', badgeText: 'text-neon-purple', badgeBorder: 'border-neon-purple/30' },
    pink: { gradient: 'from-neon-pink/25 to-neon-pink/10', text: 'text-neon-pink', glow: 'rgba(255,94,158,0.3)', ring: 'ring-neon-pink/50', activeBg: 'bg-neon-pink', activeGlow: 'rgba(255,94,158,0.5)', badgeBg: 'bg-neon-pink/20', badgeText: 'text-neon-pink', badgeBorder: 'border-neon-pink/30' },
    emerald: { gradient: 'from-emerald-500/25 to-emerald-500/10', text: 'text-emerald-400', glow: 'rgba(16,185,129,0.3)', ring: 'ring-emerald-500/50', activeBg: 'bg-emerald-500', activeGlow: 'rgba(16,185,129,0.5)', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-300', badgeBorder: 'border-emerald-500/30' },
    amber: { gradient: 'from-amber-500/25 to-amber-500/10', text: 'text-amber-400', glow: 'rgba(245,158,11,0.3)', ring: 'ring-amber-500/50', activeBg: 'bg-amber-500', activeGlow: 'rgba(245,158,11,0.5)', badgeBg: 'bg-amber-500/20', badgeText: 'text-amber-300', badgeBorder: 'border-amber-500/30' },
  };

  const c = colorMap[color] || colorMap.accent;

  const handleMouse = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -8, y: x * 8 });
  };

  const resetTilt = () => { setTilt({ x: 0, y: 0 }); setHovered(false); };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onMouseMove={handleMouse}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={resetTilt}
      style={{
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: 'transform 0.15s ease-out',
      }}
      onClick={onClick}
      className={cn(
        'glass-card rounded-2xl p-5 relative overflow-hidden group transition-all duration-200',
        onClick ? 'cursor-pointer' : 'cursor-default',
        active && `ring-2 ${c.ring} bg-white/[0.03]`,
      )}
    >
      {/* Glow orb — amplified when active */}
      <motion.div
        className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${active ? c.activeGlow : c.glow}, transparent)` }}
        animate={{
          opacity: active ? [0.5, 0.8, 0.5] : hovered ? 0.7 : 0.3,
          scale: active ? [1.1, 1.4, 1.1] : hovered ? 1.2 : 1,
        }}
        transition={active ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.4 }}
      />

      {/* Second glow orb — only when active, bottom-left pulse */}
      <AnimatePresence>
        {active && (
          <motion.div
            className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${c.activeGlow}, transparent)` }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.8, 1.2, 0.8] }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      {/* Shimmer sweep on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
        initial={{ x: '-100%' }}
        animate={hovered ? { x: '100%' } : { x: '-100%' }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      />

      {/* Inner top shine — brighter when active */}
      <div className={cn(
        'absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent to-transparent',
        active ? 'via-white/[0.15]' : 'via-white/[0.06]',
      )} />

      {/* Active indicator badge — top right */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -4 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className={cn(
              'absolute top-3 right-3 flex items-center gap-1 rounded-full border px-2 py-0.5',
              c.badgeBg, c.badgeBorder,
            )}
          >
            <motion.div
              className={cn('h-1.5 w-1.5 rounded-full', c.activeBg)}
              animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className={cn('text-[10px] font-semibold', c.badgeText)}>Active</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <motion.div
          className={cn('inline-flex rounded-xl bg-gradient-to-br p-3 mb-4', c.gradient)}
          animate={
            active
              ? { scale: [1, 1.08, 1], rotate: 0 }
              : hovered
                ? { scale: 1.1, rotate: [0, -5, 5, 0] }
                : { scale: 1, rotate: 0 }
          }
          transition={active ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.4 }}
        >
          <Icon className={cn('h-5 w-5', c.text)} />
        </motion.div>
        <p className={cn('text-3xl font-bold mb-1 tracking-tight', active ? c.text : 'text-white')}>
          {typeof value === 'number' ? <AnimatedCounter value={value} /> : (value ?? '—')}
        </p>
        <p className={cn('text-xs font-medium', active ? 'text-dark-300' : 'text-dark-400')}>{label}</p>
        {trend && (
          <motion.p
            className={cn('text-[11px] mt-2 font-medium', trend > 0 ? 'text-emerald-400' : 'text-red-400')}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% this week
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
