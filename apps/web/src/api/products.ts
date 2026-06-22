import { api } from './client'

export interface Product {
  id: string
  code: string | null
  description: string | null
  isSalesItem: boolean | null
  stock: number | null
  itemGroupDescription: string | null
  itemGroup: { id: string; description: string | null } | null
  category: { id: number; name: { nl?: string; en?: string; de?: string } } | null
}

export interface PaginatedProducts {
  data: Product[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export const getProducts = (params?: { page?: number; limit?: number; excludeCategoryId?: number; search?: string }) =>
  api.get<PaginatedProducts>('/products', { params })
