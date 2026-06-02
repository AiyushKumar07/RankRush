import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function XPProgress({ level, xp, xpToNextLevel, rankTitle }) {
  const pct = Math.min(100, Math.round((xp / xpToNextLevel) * 100));

  return (
    <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-500/15 via-transparent to-neon-cyan/[0.08]" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-dark-400 font-medium">Level</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold gradient-text">Lvl {level}</h3>
              <span className="text-sm text-dark-200">· {rankTitle}</span>
            </div>
          </div>
          <motion.div
            className="p-3 rounded-xl bg-gradient-to-br from-accent-500/30 to-neon-cyan/15 border border-accent-400/20"
            animate={{ rotate: [0, 6, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
          >
            <Sparkles className="h-5 w-5 text-accent-200" />
          </motion.div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-dark-300">
              <span className="font-semibold text-dark-100">{xp.toLocaleString()}</span> /{' '}
              {xpToNextLevel.toLocaleString()} XP
            </span>
            <span className="text-accent-300 font-semibold">{pct}%</span>
          </div>
          <div className="relative h-3 rounded-full bg-dark-800/80 overflow-hidden border border-white/[0.04]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent-500 via-accent-400 to-neon-cyan"
            />
            <motion.div
              className="absolute inset-0 opacity-50"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
              }}
            />
          </div>
          <p className="text-[11px] text-dark-400">
            {(xpToNextLevel - xp).toLocaleString()} XP to reach Lvl {level + 1}
          </p>
        </div>
      </div>
    </div>
  );
}
