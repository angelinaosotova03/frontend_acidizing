export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface TokenPairResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface UserResponse {
  id: number
  username: string
  email: string | null
  is_active: boolean
  created_at: string
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}
