import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import StudentLoginPage from './pages/StudentLoginPage';
import StudentSignupPage from './pages/StudentSignupPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfileOnboardingPage from './pages/ProfileOnboardingPage';
import DashboardPage from './pages/DashboardPage';
import QuizzesPage from './pages/QuizzesPage';
import LandingPage from './pages/LandingPage';

function RequireAuth({ children, adminRoute = false }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to={adminRoute ? '/admin/login' : '/login'} replace />;
  return children;
}

function RequireOnboarded({ children, adminRoute = false }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to={adminRoute ? '/admin/login' : '/login'} replace />;
  if (!user.isOnboarded && user.role === 'STUDENT') return <Navigate to="/onboarding" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    if (!user.isOnboarded && user.role === 'STUDENT') return <Navigate to="/onboarding" replace />;
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public pages */}
          <Route path="/" element={<LandingPage />} />

          {/* Student auth flow */}
          <Route path="/signup" element={<GuestOnly><StudentSignupPage /></GuestOnly>} />
          <Route path="/login" element={<GuestOnly><StudentLoginPage /></GuestOnly>} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Onboarding (requires auth, but not onboarded yet) */}
          <Route
            path="/onboarding"
            element={<RequireAuth><ProfileOnboardingPage /></RequireAuth>}
          />

          {/* Admin auth */}
          <Route path="/admin/login" element={<LoginPage />} />

          {/* Admin dashboard (requires auth + onboarded) */}
          <Route
            path="/admin"
            element={
              <RequireOnboarded adminRoute>
                <AppLayout />
              </RequireOnboarded>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="quizzes" element={<QuizzesPage />} />
          </Route>

          {/* Catch-all */}
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
