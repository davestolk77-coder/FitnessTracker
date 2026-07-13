import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/ToastProvider.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'
import { AuthGate } from './auth/AuthGate.jsx'
import { SyncProvider } from './sync/SyncProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <SyncProvider>
          <AuthGate><App /></AuthGate>
        </SyncProvider>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
)
