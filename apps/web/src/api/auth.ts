import { api } from './client'

export interface UserProfile {
  id: number
  email: string
  role: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  createdAt: string
}

export const getMe = () => api.get<UserProfile>('/auth/me')

export const register = (email: string, password: string, confirmPassword: string) =>
  api.post('/auth/register', { email, password, confirmPassword })

export const login = (email: string, password: string) =>
  api.post<{ accessToken: string }>('/auth/login', { email, password })

export const forgotPassword = (email: string) =>
  api.post('/auth/forgot-password', { email })

export const resetPassword = (token: string, newPassword: string, confirmPassword: string) =>
  api.post('/auth/reset-password', { token, newPassword, confirmPassword })

export const exchangeOAuthCode = (code: string) =>
  api.get<{ accessToken: string }>(`/auth/exchange?code=${code}`)

export const logout = () => api.post('/auth/logout')
