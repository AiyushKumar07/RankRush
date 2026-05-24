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
import RedeemCodesPage from './pages/RedeemCodesPage';
import LandingPage from './pages/LandingPage';
import StudentLayout from './components/layout/StudentLayout';
import StudentDashboardPage from './pages/student/StudentDashboardPage';
import StudentQuizzesPage from './pages/student/StudentQuizzesPage';
import StudentProfilePage from './pages/student/StudentProfilePage';
import StudentActivityPage from './pages/student/StudentActivityPage';
import QuizSessionPage from './pages/student/QuizSessionPage';
import {
  StudentLeaderboardPage,
  StudentNotesPage,
  StudentVideoLecturesPage,
  StudentChatPage,
} from './pages/student/ComingSoonPages';
import PricingPage from './pages/student/PricingPage';
import ReferAndEarnPage from './pages/student/ReferAndEarnPage';
import BillingHistoryPage from './pages/student/BillingHistoryPage';

function RequireAuth({ children, adminRoute = false, studentRoute = false }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to={adminRoute ? '/admin/login' : '/app/login'} replace />;
  
  if (adminRoute && user.role !== 'ADMIN') return <Navigate to="/app/dashboard" replace />;
  if (studentRoute && user.role !== 'STUDENT') return <Navigate to="/admin/dashboard" replace />;
  
  return children;
}

function RequireOnboarded({ children, adminRoute = false, studentRoute = false }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to={adminRoute ? '/admin/login' : '/app/login'} replace />;
  
  if (adminRoute && user.role !== 'ADMIN') return <Navigate to="/app/dashboard" replace />;
  if (studentRoute && user.role !== 'STUDENT') return <Navigate to="/admin/dashboard" replace />;
  
  if (!user.isOnboarded && user.role === 'STUDENT') return <Navigate to="/app/onboarding" replace />;
  return children;
}

function GuestOnly({ children, adminRoute = false, studentRoute = false }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    if (!user.isOnboarded && user.role === 'STUDENT') return <Navigate to="/app/onboarding" replace />;
    return <Navigate to={user.role === 'ADMIN' ? '/admin/dashboard' : '/app/dashboard'} replace />;
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
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />
          <Route path="/reset-password" element={<GuestOnly><ResetPasswordPage /></GuestOnly>} />

          {/* Student auth flow */}
          <Route path="/app/signup" element={<GuestOnly studentRoute><StudentSignupPage /></GuestOnly>} />
          <Route path="/app/login" element={<GuestOnly studentRoute><StudentLoginPage /></GuestOnly>} />

          {/* Onboarding (requires auth, but not onboarded yet) */}
          <Route
            path="/app/onboarding"
            element={<RequireAuth studentRoute><ProfileOnboardingPage /></RequireAuth>}
          />

          {/* Admin auth */}
          <Route path="/admin/login" element={<GuestOnly adminRoute><LoginPage /></GuestOnly>} />

          {/* Admin dashboard (requires auth + onboarded) */}
          <Route
            path="/admin"
            element={
              <RequireOnboarded adminRoute>
                <AppLayout />
              </RequireOnboarded>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="quizzes" element={<QuizzesPage />} />
            <Route path="redeem-codes" element={<RedeemCodesPage />} />
          </Route>

          {/* Student App (requires auth + onboarded) */}
          <Route
            path="/app"
            element={
              <RequireOnboarded studentRoute>
                <StudentLayout />
              </RequireOnboarded>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboardPage />} />
            <Route path="quizzes" element={<StudentQuizzesPage />} />
            <Route path="profile" element={<StudentProfilePage />} />
            <Route path="activity" element={<StudentActivityPage />} />
            
            {/* Coming Soon */}
            <Route path="leaderboard" element={<StudentLeaderboardPage />} />
            <Route path="notes" element={<StudentNotesPage />} />
            <Route path="lectures" element={<StudentVideoLecturesPage />} />
            <Route path="chat" element={<StudentChatPage />} />

            {/* Token & Billing */}
            <Route path="pricing" element={<PricingPage />} />
            <Route path="refer-and-earn" element={<ReferAndEarnPage />} />
            <Route path="billing" element={<BillingHistoryPage />} />
          </Route>

          {/* Standalone Quiz Session (No Sidebar/Header) */}
          <Route
            path="/app/quizzes/:id/session"
            element={
              <RequireOnboarded studentRoute>
                <QuizSessionPage />
              </RequireOnboarded>
            }
          />

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
