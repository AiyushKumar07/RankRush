import { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import StudentLayout from './components/layouts/StudentLayout'
import AdminLayout from './components/layouts/AdminLayout'
import BrandLoader from './components/brand/BrandLoader'
import {
  LandingPage,
  LoginPage,
  SignupPage,
  ForgotPasswordPage,
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
} from './routes'

function Loader() {
  return <BrandLoader />
}

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

function RedirectIfAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  if (user) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/app'} replace />
  }
  return children
}

export default function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />
        <Route path="/signup" element={<RedirectIfAuth><SignupPage /></RedirectIfAuth>} />
        <Route path="/forgot-password" element={<RedirectIfAuth><ForgotPasswordPage /></RedirectIfAuth>} />
        <Route path="/admin/login" element={<RedirectIfAuth><AdminLoginPage /></RedirectIfAuth>} />

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
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
