import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const TONE_BG = {
  accent: 'from-accent-500/15 to-accent-700/5 border-accent-500/15',
  cyan: 'from-neon-cyan/15 to-emerald-500/5 border-neon-cyan/20',
  pink: 'from-neon-pink/15 to-rose-600/5 border-neon-pink/20',
  amber: 'from-amber-500/15 to-orange-600/5 border-amber-500/20',
  emerald: 'from-emerald-500/15 to-teal-600/5 border-emerald-500/20',
  purple: 'from-neon-purple/15 to-violet-700/5 border-neon-purple/20',
  slate: 'from-white/[0.04] to-white/[0.01] border-white/[0.06]',
};

const TONE_ICON = {
  accent: 'text-accent-300',
  cyan: 'text-emerald-300',
  pink: 'text-rose-300',
  amber: 'text-amber-300',
  emerald: 'text-emerald-300',
  purple: 'text-violet-300',
  slate: 'text-dark-200',
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'accent',
  delta,
  className,
  children,
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className={cn(
        'glass-card relative overflow-hidden rounded-2xl p-5',
        'hover:border-white/[0.08] transition-colors',
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90',
          TONE_BG[tone],
        )}
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          {Icon && (
            <div className={cn('p-2 rounded-xl bg-white/[0.04] border border-white/[0.04]', TONE_ICON[tone])}>
              <Icon className="h-4 w-4" />
            </div>
          )}
          {delta && (
            <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/15">
              {delta}
            </span>
          )}
        </div>
        <p className="text-[11px] uppercase tracking-widest text-dark-400 font-medium">{label}</p>
        <p className="text-2xl sm:text-3xl font-bold gradient-text mt-1">{value}</p>
        {hint && <p className="text-xs text-dark-400 mt-1.5">{hint}</p>}
        {children}
      </div>
    </motion.div>
  );
}
