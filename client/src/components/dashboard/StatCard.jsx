import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
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

export default function StatCard({ icon: Icon, label, value, trend, color = 'accent' }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);

  const colorMap = {
    accent: { gradient: 'from-accent-500/25 to-accent-600/10', text: 'text-accent-400', glow: 'rgba(124,107,245,0.3)', bg: 'from-accent-500/15 to-accent-500/5' },
    cyan: { gradient: 'from-neon-cyan/25 to-neon-cyan/10', text: 'text-neon-cyan', glow: 'rgba(0,232,198,0.3)', bg: 'from-neon-cyan/15 to-neon-cyan/5' },
    purple: { gradient: 'from-neon-purple/25 to-neon-purple/10', text: 'text-neon-purple', glow: 'rgba(196,113,245,0.3)', bg: 'from-neon-purple/15 to-neon-purple/5' },
    pink: { gradient: 'from-neon-pink/25 to-neon-pink/10', text: 'text-neon-pink', glow: 'rgba(255,94,158,0.3)', bg: 'from-neon-pink/15 to-neon-pink/5' },
    emerald: { gradient: 'from-emerald-500/25 to-emerald-500/10', text: 'text-emerald-400', glow: 'rgba(16,185,129,0.3)', bg: 'from-emerald-500/15 to-emerald-500/5' },
    amber: { gradient: 'from-amber-500/25 to-amber-500/10', text: 'text-amber-400', glow: 'rgba(245,158,11,0.3)', bg: 'from-amber-500/15 to-amber-500/5' },
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
      className="glass-card rounded-2xl p-5 relative overflow-hidden group cursor-default"
    >
      {/* Glow orb */}
      <motion.div
        className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${c.glow}, transparent)` }}
        animate={{ opacity: hovered ? 0.7 : 0.3, scale: hovered ? 1.2 : 1 }}
        transition={{ duration: 0.4 }}
      />

      {/* Shimmer sweep on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
        initial={{ x: '-100%' }}
        animate={hovered ? { x: '100%' } : { x: '-100%' }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      />

      {/* Inner top shine */}
      <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="relative">
        <motion.div
          className={cn('inline-flex rounded-xl bg-gradient-to-br p-3 mb-4', c.gradient)}
          animate={hovered ? { scale: 1.1, rotate: [0, -5, 5, 0] } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Icon className={cn('h-5 w-5', c.text)} />
        </motion.div>
        <p className="text-3xl font-bold text-white mb-1 tracking-tight">
          {typeof value === 'number' ? <AnimatedCounter value={value} /> : (value ?? '—')}
        </p>
        <p className="text-xs text-dark-400 font-medium">{label}</p>
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
