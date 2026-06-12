import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import App from './App'
import './index.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'var(--rr-font-sans)',
              fontSize: 14,
              borderRadius: 'var(--rr-r-md)',
              background: 'var(--rr-surface)',
              color: 'var(--rr-fg)',
              border: '1px solid var(--rr-border)',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
)
