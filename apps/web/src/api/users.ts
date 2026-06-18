import { api } from './client'

export interface UserProfile {
  id: number
  email: string
  role: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  isActive: boolean
  createdAt: string
}

export const getMe = () => api.get<UserProfile>('/users/me')
export const deleteMe = () => api.delete('/users/me')
