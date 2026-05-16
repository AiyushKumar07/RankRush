import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="mb-4 rounded-2xl bg-dark-700/50 p-4">
        <Icon className="h-10 w-10 text-dark-400" />
      </div>
      <h3 className="text-lg font-medium text-dark-100">{title}</h3>
      {description && <p className="mt-1 text-sm text-dark-300 max-w-md">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
