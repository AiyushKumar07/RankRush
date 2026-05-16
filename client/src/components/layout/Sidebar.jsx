import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  LogOut,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
];

const sidebarVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
};

export default function Sidebar() {
  const { user, logout } = useAuth();

  const filteredItems = navItems.filter(
    (item) => !item.role || user?.role === item.role || user?.role === 'SUPER_ADMIN'
  );

  return (
    <motion.aside
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }}
      className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col glass-frosted border-r border-white/[0.04]"
    >
      {/* Animated top edge highlight */}
      <motion.div
        className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-accent-400/20 to-transparent"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Brand */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="flex items-center gap-3.5 px-6 py-6 border-b border-white/[0.04]"
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-xl bg-accent-500/20 blur-lg animate-pulse-glow" />
          <motion.div
            className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500/25 to-neon-purple/20 border border-accent-400/15"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            >
              <Zap className="h-5 w-5 text-accent-300" />
            </motion.div>
          </motion.div>
        </div>
        <div>
          <h1 className="text-lg font-bold gradient-text tracking-tight">RankRush</h1>
          <motion.p
            className="text-[10px] text-dark-400 uppercase tracking-[0.2em]"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            Quiz Admin
          </motion.p>
        </div>
      </motion.div>

      {/* Nav */}
      <motion.nav
        variants={sidebarVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
      >
        {filteredItems.map((item) => (
          <motion.div key={item.to} variants={itemVariants}>
            <NavLink
              to={item.to}
              end
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300',
                  isActive
                    ? 'text-accent-300'
                    : 'text-dark-300 hover:text-dark-50'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="navActive"
                      className="absolute inset-0 rounded-xl bg-accent-500/10 border border-accent-500/15"
                      style={{
                        boxShadow: '0 0 20px rgba(124,107,245,0.08), inset 0 1px 0 rgba(255,255,255,0.03)',
                      }}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  {!isActive && (
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-white/[0.02] transition-opacity duration-300" />
                  )}
                  <div className="relative flex items-center gap-3 flex-1">
                    <motion.div
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      <item.icon className={cn('h-[18px] w-[18px] transition-colors', isActive && 'text-accent-400')} />
                    </motion.div>
                    <span className="relative">{item.label}</span>
                  </div>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="relative flex items-center"
                    >
                      <motion.div
                        animate={{ x: [0, 3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ChevronRight className="h-3.5 w-3.5 text-accent-400/60" />
                      </motion.div>
                    </motion.div>
                  )}
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </motion.nav>

      {/* User section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="border-t border-white/[0.04] p-4"
      >
        <motion.div
          className="glass-card rounded-xl p-3 mb-3"
          whileHover={{ scale: 1.02, borderColor: 'rgba(124,107,245,0.2)' }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <motion.div
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500/25 to-neon-cyan/15 text-accent-300 text-xs font-bold border border-accent-400/10"
                whileHover={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.4 }}
              >
                {user?.name?.charAt(0) || 'U'}
              </motion.div>
              <motion.div
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-dark-900"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dark-100 truncate">{user?.name}</p>
              <p className="text-[10px] text-dark-400 uppercase tracking-wider">
                {user?.role?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        </motion.div>
        <motion.button
          whileHover={{ x: 4, backgroundColor: 'rgba(239, 68, 68, 0.06)' }}
          whileTap={{ scale: 0.97 }}
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm text-dark-400 hover:text-red-400 transition-all duration-200"
        >
          <motion.div whileHover={{ rotate: -15 }}>
            <LogOut className="h-4 w-4" />
          </motion.div>
          Sign Out
        </motion.button>
      </motion.div>
    </motion.aside>
  );
}
