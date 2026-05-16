import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import { Zap } from 'lucide-react';

function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute top-[10%] right-[10%] w-[300px] h-[300px] rounded-full bg-accent-500/[0.03] blur-[80px]"
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 15, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[20%] left-[40%] w-[250px] h-[250px] rounded-full bg-neon-cyan/[0.02] blur-[80px]"
        animate={{ x: [0, -25, 15, 0], y: [0, 20, -30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[50%] right-[30%] w-[200px] h-[200px] rounded-full bg-neon-purple/[0.02] blur-[60px]"
        animate={{ x: [0, 20, -15, 0], y: [0, -15, 25, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

export default function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-5"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-accent-500/20 blur-xl animate-pulse" />
            <motion.div
              className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500/30 to-accent-700/20 border border-accent-400/20"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Zap className="h-7 w-7 text-accent-300" />
              </motion.div>
            </motion.div>
          </div>
          <div className="text-center">
            <motion.p
              className="text-sm font-medium text-dark-200"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Loading RankRush
            </motion.p>
            <div className="mt-3 flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                  className="h-2 w-2 rounded-full bg-accent-400"
                />
              ))}
            </div>
            {/* Progress bar */}
            <div className="mt-4 w-48 h-1 rounded-full bg-dark-800 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-accent-500 to-neon-cyan rounded-full"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace />;

  return (
    <div className="relative flex min-h-screen bg-dark-950">
      {/* Immersive background */}
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

      {/* Floating background orbs */}
      <BackgroundOrbs />

      <Sidebar />
      <main className="relative ml-[260px] flex-1 p-7">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
