import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="relative mb-5">
        <motion.div
          className="absolute inset-0 rounded-2xl bg-accent-500/10 blur-xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="relative rounded-2xl glass-frosted p-5"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Icon className="h-10 w-10 text-dark-300" />
          </motion.div>
        </motion.div>
        {/* Decorative orbiting dots */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-accent-400/40"
            style={{ top: '50%', left: '50%' }}
            animate={{
              x: [Math.cos((i * 2 * Math.PI) / 3) * 35, Math.cos((i * 2 * Math.PI) / 3 + Math.PI * 2) * 35],
              y: [Math.sin((i * 2 * Math.PI) / 3) * 35, Math.sin((i * 2 * Math.PI) / 3 + Math.PI * 2) * 35],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear', delay: i * 0.5 }}
          />
        ))}
      </div>
      <motion.h3
        className="text-lg font-semibold text-dark-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {title}
      </motion.h3>
      {description && (
        <motion.p
          className="mt-2 text-sm text-dark-400 max-w-md leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {description}
        </motion.p>
      )}
      {action && (
        <motion.div
          className="mt-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}
