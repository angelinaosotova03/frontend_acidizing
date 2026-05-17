import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './hooks/useAuth'
import { HandoffProvider } from './hooks/useHandoff'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <HandoffProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4200,
              style: {
                background: '#fff',
                color: '#0F172A',
                border: '1px solid #E2E8F0',
                borderRadius: 6,
                fontSize: 13,
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 12px 32px -8px rgba(15,23,42,.18)',
                padding: '10px 14px',
              },
            }}
          />
        </HandoffProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
