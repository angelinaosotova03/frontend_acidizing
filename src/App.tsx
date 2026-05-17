import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute'
import { AppShell } from './components/Layout'
import { LoginPage }          from './pages/auth/Login'
import { RegisterPage }       from './pages/auth/Register'
import { ForgotPasswordPage } from './pages/auth/ForgotPassword'
import { ResetPasswordPage }  from './pages/auth/ResetPassword'
import { DashboardPage }      from './pages/Dashboard'
import { VolumesPage }        from './pages/Volumes'
import { PredictPage }        from './pages/Predict'
import { BatchPredictPage }   from './pages/BatchPredict'
import { ProfilePage }        from './pages/Profile'

export default function App() {
  return (
    <Routes>
      <Route path="/login"           element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register"        element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
      <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
      <Route path="/reset-password"  element={<PublicOnlyRoute><ResetPasswordPage /></PublicOnlyRoute>} />

      <Route path="/" element={<ProtectedRoute><AppShell><DashboardPage /></AppShell></ProtectedRoute>} />
      <Route path="/volumes"        element={<ProtectedRoute><AppShell><VolumesPage /></AppShell></ProtectedRoute>} />
      <Route path="/predict"        element={<ProtectedRoute><AppShell><PredictPage /></AppShell></ProtectedRoute>} />
      <Route path="/predict/batch"  element={<ProtectedRoute><AppShell><BatchPredictPage /></AppShell></ProtectedRoute>} />
      <Route path="/profile"        element={<ProtectedRoute><AppShell><ProfilePage /></AppShell></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
