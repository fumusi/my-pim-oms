import { api } from './client'

export interface AdminUser {
  id: number
  email: string
  role: string
  firstName: string | null
  lastName: string | null
  isActive: boolean
  createdAt: string
  customerId: number | null
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
  body: { email?: string; role?: string; isActive?: boolean; customerId?: number | null },
) => api.patch<AdminUser>(`/users/${id}`, body)

export const adminDeleteUser = (id: number) => api.delete(`/users/${id}`)

export interface ImportUsersResult {
  imported: number
  skipped: number
  errors: { row: number; email: string; reason: string }[]
}

export const importUsers = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post<ImportUsersResult>('/users/import', fd)
}

export const getUsersImportTemplate = () =>
  api.get<Blob>('/users/import/template', { responseType: 'blob' })
