import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-dark-950/70 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className={`relative w-full ${maxWidth} max-h-[85vh] overflow-y-auto`}
          >
            <div className="glass-card rounded-2xl p-6 glow-accent inner-shine overflow-hidden">
              {/* Top edge shine */}
              <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-accent-400/25 to-transparent" />

              {title && (
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white">{title}</h2>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="rounded-xl p-2 text-dark-300 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>
              )}
              {!title && (
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 rounded-xl p-2 text-dark-300 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              )}
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
