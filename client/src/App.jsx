import { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import StudentLayout from './components/layouts/StudentLayout'
import AdminLayout from './components/layouts/AdminLayout'
import BrandLoader from './components/brand/BrandLoader'
import ScrollToTop from './components/ScrollToTop'
import {
  LandingPage,
  PrivacyPolicyPage,
  TermsPage,
  ComingSoonPage,
  LoginPage,
  SignupPage,
  ForgotPasswordPage,
  OnboardingPage,
  AdminLoginPage,
  DashboardPage,
  QuizzesPage,
  QuizHistoryPage,
  QuizInstructionsPage,
  QuizSessionPage,
  QuizResultPage,
  ActivityPage,
  AnalyticsPage,
  BadgesPage,
  TokensPage,
  ReferPage,
  LeaderboardsPage,
  PricingPage,
  BillingPage,
  ProfilePage,
  AdminDashboardPage,
  AdminQuizzesPage,
  AdminPlansPage,
  AdminCodesPage,
  AdminTransactionsPage,
  AdminStudentsPage,
  AdminQuestionsPage,
} from './routes'

function Loader() {
  return <BrandLoader />
}

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  // Students must finish profile setup before entering the app. (Email signups
  // are onboarded at signup; this gates first-time Google SSO accounts.)
  if (user.role === 'STUDENT' && !user.isOnboarded) {
    return <Navigate to="/onboarding" replace />
  }
  return children
}

// Guards the /onboarding route: logged-in students who still need setup. Anyone
// already onboarded (or non-student) is bounced to their home, so there's no
// loop against RequireAuth's redirect into here.
function RequireOnboarding({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'STUDENT') return <Navigate to="/admin" replace />
  if (user.isOnboarded) return <Navigate to="/app" replace />
  return children
}

function RedirectIfAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  if (user) {
    const dest =
      user.role === 'ADMIN' ? '/admin' : user.isOnboarded ? '/app' : '/onboarding'
    return <Navigate to={dest} replace />
  }
  return children
}

export default function App() {
  return (
    <Suspense fallback={<Loader />}>
      <ScrollToTop />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/coming-soon" element={<ComingSoonPage />} />
        <Route path="/login" element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />
        <Route path="/signup" element={<RedirectIfAuth><SignupPage /></RedirectIfAuth>} />
        <Route path="/forgot-password" element={<RedirectIfAuth><ForgotPasswordPage /></RedirectIfAuth>} />
        <Route path="/admin/login" element={<RedirectIfAuth><AdminLoginPage /></RedirectIfAuth>} />

        {/* First-time profile setup (gated: logged-in students who aren't onboarded) */}
        <Route path="/onboarding" element={<RequireOnboarding><OnboardingPage /></RequireOnboarding>} />

        {/* Student — wrapped in StudentLayout */}
        <Route element={<RequireAuth role="STUDENT"><StudentLayout /></RequireAuth>}>
          <Route path="/app" element={<DashboardPage />} />
          <Route path="/app/quizzes" element={<QuizzesPage />} />
          <Route path="/app/quizzes/history" element={<QuizHistoryPage />} />
          <Route path="/app/activity" element={<ActivityPage />} />
          <Route path="/app/analytics" element={<AnalyticsPage />} />
          <Route path="/app/badges" element={<BadgesPage />} />
          <Route path="/app/leaderboards" element={<LeaderboardsPage />} />
          <Route path="/app/tokens" element={<TokensPage />} />
          <Route path="/app/refer" element={<ReferPage />} />
          <Route path="/app/pricing" element={<PricingPage />} />
          <Route path="/app/billing" element={<BillingPage />} />
          <Route path="/app/profile" element={<ProfilePage />} />
        </Route>

        {/* Quiz instructions / session / result — full-bleed, own topbar */}
        <Route path="/app/quizzes/:quizId/instructions" element={<RequireAuth role="STUDENT"><QuizInstructionsPage /></RequireAuth>} />
        <Route path="/app/quizzes/:quizId/session" element={<RequireAuth role="STUDENT"><QuizSessionPage /></RequireAuth>} />
        <Route path="/app/quizzes/:quizId/result" element={<RequireAuth role="STUDENT"><QuizResultPage /></RequireAuth>} />

        {/* Admin — wrapped in AdminLayout */}
        <Route element={<RequireAuth role="ADMIN"><AdminLayout /></RequireAuth>}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/quizzes" element={<AdminQuizzesPage />} />
          <Route path="/admin/plans" element={<AdminPlansPage />} />
          <Route path="/admin/codes" element={<AdminCodesPage />} />
          <Route path="/admin/transactions" element={<AdminTransactionsPage />} />
          <Route path="/admin/students" element={<AdminStudentsPage />} />
          <Route path="/admin/questions" element={<AdminQuestionsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
