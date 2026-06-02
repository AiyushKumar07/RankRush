import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';

const variants = {
  primary:
    'bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-400 hover:to-accent-500 text-white shadow-lg shadow-accent-500/25 border border-accent-400/20',
  secondary:
    'glass-frosted hover:border-accent-500/20 text-dark-100 hover:text-white',
  danger:
    'bg-red-500/[0.08] hover:bg-red-500/15 text-red-400 border border-red-500/15 hover:border-red-500/30',
  success:
    'bg-emerald-500/[0.08] hover:bg-emerald-500/15 text-emerald-400 border border-emerald-500/15 hover:border-emerald-500/30',
  ghost:
    'hover:bg-white/[0.04] text-dark-200 hover:text-dark-50',
};

const sizes = {
  sm: 'px-3.5 py-1.5 text-xs rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3 text-base rounded-xl',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  icon: Icon,
  loading,
  disabled,
  ...props
}) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -1 }}
      whileTap={{ scale: disabled ? 1 : 0.97, y: 0 }}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 font-medium transition-all duration-300 cursor-pointer overflow-hidden',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:saturate-0',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {variant === 'primary' && (
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.08] to-white/0 opacity-0 hover:opacity-100 transition-opacity" />
      )}
      <span className="relative inline-flex items-center gap-2">
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : Icon ? (
          <Icon className="h-4 w-4" />
        ) : null}
        {children}
      </span>
    </motion.button>
  );
}
