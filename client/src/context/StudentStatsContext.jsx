import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { studentAPI } from '../services/api';

const StudentStatsContext = createContext(null);

export function StudentStatsProvider({ children }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await studentAPI.getStats();
      setStats(res?.data?.stats || null);
    } catch {
      // Silently fail — stats are non-critical
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchStats();
  }, [fetchStats]);

  return (
    <StudentStatsContext.Provider value={{ stats, loading, refresh }}>
      {children}
    </StudentStatsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useStudentStats = () => {
  const context = useContext(StudentStatsContext);
  if (!context) throw new Error('useStudentStats must be used within StudentStatsProvider');
  return context;
};
