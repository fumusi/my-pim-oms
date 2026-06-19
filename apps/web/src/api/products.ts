import { api } from './client'

export interface Product {
  id: string
  code: string | null
  description: string | null
  isSalesItem: boolean | null
  itemGroupDescription: string | null
  itemGroup: { id: string; description: string | null } | null
}

export interface PaginatedProducts {
  data: Product[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export const getProducts = (page = 1, limit = 20) =>
  api.get<PaginatedProducts>(`/products?page=${page}&limit=${limit}`)
