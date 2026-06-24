import { api } from './client'

export type CategoryStatus = 'active' | 'inactive'

export interface CategoryPimProduct {
  id: number
  exactId: string | null
  name: Record<string, string> | null
  barcode: string | null
  status: string
  stock: number | null
}

export interface PaginatedPimProducts {
  data: CategoryPimProduct[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export interface LocalizedText {
  nl?: string
  en?: string
  de?: string
}

export interface Category {
  id: number
  name: LocalizedText
  description: LocalizedText | null
  image: string | null
  icon: string | null
  status: CategoryStatus
  template: Record<string, unknown> | null
  productCount: number
  createdAt: string
  updatedAt: string
  updatedBy: string | null
  archivedAt: string | null
}

export interface CategoryDetail extends Category {
  products: PaginatedPimProducts
}

export interface AssignResult {
  assigned: number
  skipped: { id: string; reason: string }[]
}

export interface CreateCategoryBody {
  name: LocalizedText
  description?: LocalizedText | null
  image?: string | null
  icon?: string | null
  status?: CategoryStatus
  template?: Record<string, unknown> | null
}

export interface UpdateCategoryBody {
  name?: LocalizedText
  description?: LocalizedText | null
  image?: string | null
  icon?: string | null
  template?: Record<string, unknown> | null
}

export const getCategories = (params?: { status?: string }) =>
  api.get<Category[]>('/categories', { params })

export const getCategoryDetail = (id: number, params?: { page?: number; limit?: number; search?: string }) =>
  api.get<CategoryDetail>(`/categories/${id}`, { params })

export const createCategory = (body: CreateCategoryBody) =>
  api.post<Category>('/categories', body)

export const updateCategory = (id: number, body: UpdateCategoryBody) =>
  api.patch<Category>(`/categories/${id}`, body)

export const setCategoryStatus = (id: number, status: CategoryStatus) =>
  api.patch(`/categories/${id}/status`, { status })

export const archiveCategory = (id: number) =>
  api.patch(`/categories/${id}/archive`)

export const deleteCategory = (id: number) =>
  api.delete(`/categories/${id}`)

export const assignProducts = (id: number, productIds: string[]) =>
  api.post<AssignResult>(`/categories/${id}/assign`, { productIds })

export const unassignProducts = (id: number, productIds: string[]) =>
  api.post<{ unassigned: number }>(`/categories/${id}/unassign`, { productIds })
