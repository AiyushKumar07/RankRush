import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import QuizzesPage from './pages/QuizzesPage';
import ComingSoonPage from './pages/ComingSoonPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<ComingSoonPage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="quizzes" element={<QuizzesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(19, 24, 48, 0.85)',
              color: '#bec5de',
              border: '1px solid rgba(124, 107, 245, 0.12)',
              borderRadius: '16px',
              backdropFilter: 'blur(24px) saturate(1.5)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
              fontSize: '13px',
              fontWeight: '500',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#070a12' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#070a12' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
