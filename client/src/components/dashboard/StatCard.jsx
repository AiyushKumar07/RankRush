import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function StatCard({ icon: Icon, label, value, trend, color = 'accent' }) {
  const colorMap = {
    accent: 'from-accent-500/20 to-accent-500/5 text-accent-400',
    cyan: 'from-neon-cyan/20 to-neon-cyan/5 text-neon-cyan',
    purple: 'from-neon-purple/20 to-neon-purple/5 text-neon-purple',
    pink: 'from-neon-pink/20 to-neon-pink/5 text-neon-pink',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="glass-card rounded-2xl p-5 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br opacity-30 blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:opacity-50 transition-opacity"
        style={{
          background: `radial-gradient(circle, ${
            color === 'accent' ? 'rgba(108,92,231,0.3)' :
            color === 'cyan' ? 'rgba(0,245,212,0.3)' :
            color === 'emerald' ? 'rgba(16,185,129,0.3)' :
            color === 'amber' ? 'rgba(245,158,11,0.3)' :
            'rgba(177,78,255,0.3)'
          }, transparent)`
        }}
      />
      <div className="relative">
        <div className={cn('inline-flex rounded-xl bg-gradient-to-br p-2.5 mb-3', colorMap[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-2xl font-bold text-white mb-1">{value ?? '—'}</p>
        <p className="text-xs text-dark-400">{label}</p>
        {trend && (
          <p className={cn('text-[11px] mt-1', trend > 0 ? 'text-emerald-400' : 'text-red-400')}>
            {trend > 0 ? '+' : ''}{trend}% this week
          </p>
        )}
      </div>
    </motion.div>
  );
}
