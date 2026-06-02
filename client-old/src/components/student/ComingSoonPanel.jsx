import { motion } from 'framer-motion';
import { Bell, Sparkles } from 'lucide-react';

export default function ComingSoonPanel({
  icon: Icon,
  title,
  tagline,
  description,
  features = [],
}) {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-accent-300 mb-2">
          <Sparkles className="h-3 w-3" />
          Coming Soon
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          {title} <span className="gradient-text">is on the way</span>
        </h1>
        <p className="text-dark-300 mt-2 max-w-xl">{tagline}</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6 items-stretch">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 relative glass-card rounded-3xl p-8 flex flex-col items-center justify-center text-center overflow-hidden min-h-[280px]"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-accent-500/15 via-transparent to-neon-cyan/[0.08]"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="absolute -inset-1 rounded-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 0%, rgba(124,107,245,0.15), transparent 60%)' }}
          />
          <motion.div
            className="relative p-6 rounded-3xl bg-gradient-to-br from-accent-500/25 to-neon-cyan/15 border border-accent-400/20 mb-5"
            animate={{ y: [0, -6, 0], rotate: [0, 4, -4, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            {Icon && <Icon className="h-10 w-10 text-accent-200" />}
          </motion.div>
          <h2 className="relative text-xl font-bold text-white mb-1">We&apos;re cooking 🔥</h2>
          <p className="relative text-sm text-dark-300 max-w-[280px]">
            This module is in active build. You&apos;ll be the first to know when it ships.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="relative mt-5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-accent-500/20"
          >
            <Bell className="h-4 w-4" />
            Notify me at launch
          </motion.button>
        </motion.div>

        <div className="lg:col-span-3 grid gap-4">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-2">What to expect</h3>
            <p className="text-sm text-dark-300 leading-relaxed">{description}</p>
          </div>
          {features.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-xl p-4 flex items-start gap-3"
                >
                  {f.icon && (
                    <div className="p-1.5 rounded-lg bg-accent-500/10 text-accent-300 border border-accent-500/15">
                      <f.icon className="h-4 w-4" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-dark-100">{f.title}</p>
                    <p className="text-xs text-dark-400 mt-0.5">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
