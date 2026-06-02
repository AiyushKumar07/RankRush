import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { STATUS_COLORS } from '../../utils/constants';

export default function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.DRAFT;
  const label = status?.replace(/_/g, ' ') || 'Unknown';

  return (
    <motion.span
      whileHover={{ scale: 1.08 }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide backdrop-blur-sm border relative overflow-hidden',
        colors.bg,
        colors.text,
        colors.border
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', colors.dot)} />
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', colors.dot)} />
      </span>
      {label}
    </motion.span>
  );
}
