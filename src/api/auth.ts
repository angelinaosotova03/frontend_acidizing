import axios from 'axios'
import { authAxios, tokenStore } from './axios'
import type { LoginRequest, RegisterRequest, TokenPairResponse, UserResponse, ChangePasswordRequest } from '../types/auth'

export const authApi = {
  async login(body: LoginRequest): Promise<TokenPairResponse> {
    const r = await axios.post<TokenPairResponse>('/api/v1/auth/login', body)
    tokenStore.set(r.data.access_token, r.data.refresh_token)
    return r.data
  },

  async register(body: RegisterRequest) {
    const r = await axios.post('/api/v1/auth/register', body)
    return r.data
  },

  async logout() {
    const rt = tokenStore.getRefresh()
    try {
      if (rt) await axios.post('/api/v1/auth/logout', { refresh_token: rt })
    } finally {
      tokenStore.clear()
    }
  },

  async me(): Promise<UserResponse> {
    const r = await authAxios.get<UserResponse>('/me')
    return r.data
  },

  async changePassword(body: ChangePasswordRequest) {
    await authAxios.put('/me/password', body)
  },

  async forgotPassword(email: string) {
    const r = await axios.post('/api/v1/auth/forgot-password', { email })
    return r.data
  },

  async resetPassword(token: string, new_password: string) {
    const r = await axios.post('/api/v1/auth/reset-password', { token, new_password })
    return r.data
  },
}
