import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { authApi } from '../api/auth'
import { tokenStore } from '../api/axios'
import type { UserResponse } from '../types/auth'

interface AuthContextValue {
  user: UserResponse | null
  bootstrapping: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
}

const AuthCtx = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    const bootstrap = async () => {
      if (tokenStore.getAccess()) {
        try {
          const me = await authApi.me()
          setUser(me)
        } catch {
          tokenStore.clear()
        }
      }
      setBootstrapping(false)
    }
    bootstrap()

    const onExpired = () => setUser(null)
    window.addEventListener('opz:auth-expired', onExpired)
    return () => window.removeEventListener('opz:auth-expired', onExpired)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    await authApi.login({ username, password })
    const me = await authApi.me()
    setUser(me)
  }, [])

  const register = useCallback(async (username: string, email: string, password: string) => {
    await authApi.register({ username, email, password })
    await authApi.login({ username, password })
    const me = await authApi.me()
    setUser(me)
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
  }, [])

  const refreshMe = useCallback(async () => {
    const me = await authApi.me()
    setUser(me)
  }, [])

  return (
    <AuthCtx.Provider value={{ user, bootstrapping, login, register, logout, refreshMe }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
