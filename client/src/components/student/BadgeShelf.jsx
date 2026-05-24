import { motion } from 'framer-motion';
import {
  Sparkles, Flame, Zap, Target, Rocket, Trophy, Crown, Moon, Award, Lock,
} from 'lucide-react';
import { cn } from '../../utils/cn';

const ICONS = { Sparkles, Flame, Zap, Target, Rocket, Trophy, Crown, Moon, Award };

const TIER_STYLES = {
  bronze: {
    bg: 'from-amber-700/30 to-amber-900/10 border-amber-600/30',
    icon: 'text-amber-300',
    ring: 'ring-amber-500/30',
  },
  silver: {
    bg: 'from-slate-400/25 to-slate-600/10 border-slate-300/25',
    icon: 'text-slate-100',
    ring: 'ring-slate-300/30',
  },
  gold: {
    bg: 'from-yellow-400/30 to-amber-600/10 border-yellow-300/30',
    icon: 'text-yellow-200',
    ring: 'ring-yellow-300/30',
  },
  platinum: {
    bg: 'from-accent-400/30 to-neon-cyan/15 border-accent-300/30',
    icon: 'text-accent-100',
    ring: 'ring-accent-300/40',
  },
};

export default function BadgeShelf({ badges }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {badges.map((badge, i) => {
        const Icon = ICONS[badge.icon] || Award;
        const tier = TIER_STYLES[badge.tier] || TIER_STYLES.bronze;
        const unlocked = badge.unlocked;
        return (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ y: -3, scale: 1.02 }}
            className={cn(
              'relative glass-card rounded-2xl p-4 flex flex-col items-center text-center transition-all',
              !unlocked && 'opacity-55 saturate-50',
            )}
          >
            <div
              className={cn(
                'relative p-3 rounded-xl bg-gradient-to-br border mb-2',
                tier.bg,
                unlocked && `ring-2 ${tier.ring}`,
              )}
            >
              <Icon className={cn('h-6 w-6', tier.icon)} />
              {!unlocked && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-dark-900/60">
                  <Lock className="h-4 w-4 text-dark-300" />
                </div>
              )}
            </div>
            <p className="text-sm font-semibold text-dark-100">{badge.name}</p>
            <p className="text-[11px] text-dark-400 mt-0.5 leading-snug">{badge.desc}</p>
            <span
              className={cn(
                'mt-2 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md border',
                unlocked
                  ? 'bg-accent-500/10 border-accent-500/20 text-accent-300'
                  : 'bg-white/[0.02] border-white/[0.05] text-dark-400',
              )}
            >
              {badge.tier}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
