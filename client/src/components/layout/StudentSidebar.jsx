import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Activity,
  User,
  Trophy,
  StickyNote,
  Video,
  MessagesSquare,
  LogOut,
  ChevronRight,
  Flame,
  Coins,
} from 'lucide-react';
import toast from 'react-hot-toast';
import logo from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import { useStudentStats } from '../../context/StudentStatsContext';
import { useTokenWallet } from '../../hooks/useTokenWallet';

const primaryNav = [
  { to: '/app', end: true, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/quizzes', icon: BookOpen, label: 'Quizzes' },
  { to: '/app/activity', icon: Activity, label: 'Activity' },
  { to: '/app/refer-and-earn', icon: User, label: 'Refer & Earn' },
  { to: '/app/billing', icon: FileText, label: 'Transaction History' },
];

const soonNav = [
  { to: '/app/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/app/notes', icon: StickyNote, label: 'Notes' },
  { to: '/app/videos', icon: Video, label: 'Video Lectures' },
  { to: '/app/chat', icon: MessagesSquare, label: 'Live Chat Groups' },
];

const sidebarVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};

const itemVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
};

function NavRow({ item }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300',
          isActive ? 'text-accent-300' : 'text-dark-300 hover:text-dark-50',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="studentNavActive"
              className="absolute inset-0 rounded-xl bg-accent-500/10 border border-accent-500/15"
              style={{ boxShadow: '0 0 20px rgba(124,107,245,0.08), inset 0 1px 0 rgba(255,255,255,0.03)' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
          {!isActive && (
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-white/[0.02] transition-opacity duration-300" />
          )}
          <div className="relative flex items-center gap-3 flex-1">
            <motion.div whileHover={{ scale: 1.15, rotate: 8 }} transition={{ type: 'spring', stiffness: 400 }}>
              <item.icon className={cn('h-[18px] w-[18px] transition-colors', isActive && 'text-accent-400')} />
            </motion.div>
            <span className="relative">{item.label}</span>
          </div>
          {isActive && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative">
              <motion.div animate={{ x: [0, 3, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <ChevronRight className="h-3.5 w-3.5 text-accent-400/60" />
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </NavLink>
  );
}

function SoonRow({ item }) {
  return (
    <NavLink
      to={item.to}
      onClick={() => {
        toast(`${item.label} is coming soon — sneak peek ahead`, { icon: '🚧' });
      }}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
          isActive ? 'text-dark-100 bg-white/[0.03]' : 'text-dark-400 hover:text-dark-100 hover:bg-white/[0.02]',
        )
      }
    >
      <span className="flex items-center gap-3">
        <item.icon className="h-[17px] w-[17px]" />
        {item.label}
      </span>
      <span className="text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-accent-500/10 text-accent-300 border border-accent-500/15">
        Soon
      </span>
    </NavLink>
  );
}

export default function StudentSidebar() {
  const { user, logout } = useAuth();
  const { stats } = useStudentStats();
  const { wallet } = useTokenWallet();
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'Student';
  const initial = (user?.firstName || user?.name || 'S').charAt(0).toUpperCase();

  return (
    <motion.aside
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }}
      className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col glass-frosted border-r border-white/[0.04]"
    >
      <motion.div
        className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-accent-400/20 to-transparent"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Brand */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.04]"
      >
        <motion.img src={logo} alt="RankRush" className="h-9 w-auto" whileHover={{ scale: 1.05 }} />
        <p className="text-[10px] text-dark-400 uppercase tracking-[0.2em]">Student</p>
      </motion.div>

      {/* Streak strip */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="mx-4 mt-4 mb-2 flex items-center gap-2.5 rounded-xl px-3 py-2 bg-gradient-to-r from-orange-500/[0.08] to-amber-500/[0.04] border border-orange-500/15"
      >
        <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
          <Flame className="h-4 w-4 text-orange-400" />
        </motion.div>
        <span className="text-xs font-semibold text-orange-200">{stats?.streak ?? 0}-day streak</span>
        <span className="ml-auto text-[10px] text-dark-400">XP {stats?.xp ?? 0}</span>
      </motion.div>

      {/* Token Wallet */}
      <NavLink to="/app/pricing">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mx-4 mb-4 flex items-center gap-2.5 rounded-xl px-3 py-2 bg-gradient-to-r from-accent-500/[0.08] to-neon-cyan/[0.04] border border-accent-500/15 hover:border-accent-500/30 transition-colors"
        >
          <Coins className="h-4 w-4 text-accent-400" />
          <span className="text-xs font-semibold text-accent-200">
            {wallet?.balance !== undefined ? wallet.balance : '...'} Tokens
          </span>
          <span className="ml-auto text-[10px] text-accent-400 bg-accent-500/10 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
            Get More
          </span>
        </motion.div>
      </NavLink>

      <motion.nav
        variants={sidebarVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1"
      >
        {primaryNav.map((item) => (
          <motion.div key={item.to} variants={itemVariants}>
            <NavRow item={item} />
          </motion.div>
        ))}

        <div className="px-4 pt-5 pb-2 text-[10px] text-dark-500 uppercase tracking-widest font-semibold">
          Coming Soon
        </div>
        {soonNav.map((item) => (
          <motion.div key={item.to} variants={itemVariants}>
            <SoonRow item={item} />
          </motion.div>
        ))}
      </motion.nav>

      {/* User card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="border-t border-white/[0.04] p-4"
      >
        <NavLink
          to="/app/profile"
          className="block glass-card rounded-xl p-3 mb-3 hover:border-accent-500/20 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={displayName}
                  className="h-9 w-9 rounded-lg object-cover border border-accent-400/15"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500/25 to-neon-cyan/15 text-accent-300 text-xs font-bold border border-accent-400/10">
                  {initial}
                </div>
              )}
              <motion.div
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-dark-900"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dark-100 truncate">{displayName}</p>
              <p className="text-[10px] text-dark-400 uppercase tracking-wider">
                Lvl {stats?.level ?? 1} · {stats?.rankTitle ?? 'Rookie Learner'}
              </p>
            </div>
          </div>
        </NavLink>
        <motion.button
          whileHover={{ x: 4, backgroundColor: 'rgba(239, 68, 68, 0.06)' }}
          whileTap={{ scale: 0.97 }}
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm text-dark-400 hover:text-red-400 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </motion.button>
      </motion.div>
    </motion.aside>
  );
}
