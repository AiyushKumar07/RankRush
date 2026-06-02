import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { StudentStatsProvider } from '../../context/StudentStatsContext';
import StudentSidebar from './StudentSidebar';
import logo from '../../assets/logo.png';

function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute top-[8%] right-[8%] w-[340px] h-[340px] rounded-full bg-accent-500/[0.05] blur-[100px]"
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 15, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[10%] left-[35%] w-[260px] h-[260px] rounded-full bg-neon-cyan/[0.04] blur-[90px]"
        animate={{ x: [0, -25, 15, 0], y: [0, 20, -30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[45%] right-[28%] w-[220px] h-[220px] rounded-full bg-neon-purple/[0.03] blur-[80px]"
        animate={{ x: [0, 20, -15, 0], y: [0, -15, 25, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

export default function StudentLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-5"
        >
          <motion.img
            src={logo}
            alt="RankRush"
            className="h-14 w-auto"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="mt-4 w-48 h-1 rounded-full bg-dark-800 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-accent-500 to-neon-cyan rounded-full"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) return <Navigate to="/app/login" replace />;
  if (user.role === 'STUDENT' && !user.isOnboarded) return <Navigate to="/onboarding" replace />;

  return (
    <StudentStatsProvider>
    <div className="relative flex min-h-screen bg-dark-950">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 mesh-bg" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <motion.div
          className="absolute top-0 left-[260px] right-0 h-px"
          style={{ background: 'linear-gradient(to right, rgba(124,107,245,0.1), transparent, rgba(0,232,198,0.1))' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </div>

      <BackgroundOrbs />

      <StudentSidebar />
      <main className="relative ml-[260px] flex-1 p-7 lg:p-9">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
    </StudentStatsProvider>
  );
}
