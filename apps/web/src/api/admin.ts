import { api } from './client'

export interface AdminUser {
  id: number
  email: string
  role: string
  firstName: string | null
  lastName: string | null
  isActive: boolean
  createdAt: string
}

export interface PaginatedUsers {
  data: AdminUser[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export const getUsers = (page = 1, limit = 20) =>
  api.get<PaginatedUsers>('/users', { params: { page, limit } })

export const adminUpdateUser = (
  id: number,
  body: { email?: string; role?: string; isActive?: boolean },
) => api.patch<AdminUser>(`/users/${id}`, body)

export const adminDeleteUser = (id: number) => api.delete(`/users/${id}`)
