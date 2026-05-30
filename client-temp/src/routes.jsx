import { lazy } from 'react'

const LandingPage = lazy(() => import('./pages/marketing/LandingPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const SignupPage = lazy(() => import('./pages/auth/SignupPage'))
const AdminLoginPage = lazy(() => import('./pages/auth/AdminLoginPage'))

const DashboardPage = lazy(() => import('./pages/student/DashboardPage'))
const QuizzesPage = lazy(() => import('./pages/student/QuizzesPage'))
const QuizHistoryPage = lazy(() => import('./pages/student/QuizHistoryPage'))
const QuizSessionPage = lazy(() => import('./pages/student/QuizSessionPage'))
const QuizResultPage = lazy(() => import('./pages/student/QuizResultPage'))
const ActivityPage = lazy(() => import('./pages/student/ActivityPage'))
const AnalyticsPage = lazy(() => import('./pages/student/AnalyticsPage'))
const TokensPage = lazy(() => import('./pages/student/TokensPage'))
const ReferPage = lazy(() => import('./pages/student/ReferPage'))
const LeaderboardsPage = lazy(() => import('./pages/student/LeaderboardsPage'))
const PricingPage = lazy(() => import('./pages/student/PricingPage'))
const BillingPage = lazy(() => import('./pages/student/BillingPage'))
const ProfilePage = lazy(() => import('./pages/student/ProfilePage'))

const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminQuizzesPage = lazy(() => import('./pages/admin/AdminQuizzesPage'))
const AdminPlansPage = lazy(() => import('./pages/admin/AdminPlansPage'))
const AdminCodesPage = lazy(() => import('./pages/admin/AdminCodesPage'))

export {
  LandingPage,
  LoginPage,
  SignupPage,
  AdminLoginPage,
  DashboardPage,
  QuizzesPage,
  QuizHistoryPage,
  QuizSessionPage,
  QuizResultPage,
  ActivityPage,
  AnalyticsPage,
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
}
