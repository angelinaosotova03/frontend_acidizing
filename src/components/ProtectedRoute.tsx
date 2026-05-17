import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, bootstrapping } = useAuth()
  if (bootstrapping) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, bootstrapping } = useAuth()
  if (bootstrapping) return <FullScreenLoader />
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

function FullScreenLoader() {
  return (
    <div className="h-screen w-screen grid place-items-center bg-ink-50">
      <div className="flex items-center gap-3 text-ink-500">
        <span className="spinner dark" />
        <span className="text-sm">Загрузка…</span>
      </div>
    </div>
  )
}
