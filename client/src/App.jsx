import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(15, 18, 32, 0.95)',
              color: '#c0c6dc',
              border: '1px solid rgba(108, 92, 231, 0.15)',
              borderRadius: '12px',
              backdropFilter: 'blur(20px)',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#0a0c14' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0a0c14' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
