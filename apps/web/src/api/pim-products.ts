import { api } from './client'
import type { LocalizedText } from './categories'

export type ProductStatus = 'active' | 'inactive' | 'archived'
export type StockFilter = 'in_stock' | 'out_of_stock' | 'low_stock'

export interface PimProduct {
  id: number
  exactId: string | null
  name: LocalizedText | null
  description: LocalizedText | null
  barcode: string | null
  currency: string | null
  basePrice: number | null
  purchasePrice: number | null
  salesVatCode: string | null
  purchaseVatCode: string | null
  status: ProductStatus
  backorder: boolean
  stock: number | null
  lowStockThreshold: number | null
  endDate: string | null
  archivedAt: string | null
  category: { id: number; name: LocalizedText; template: Record<string, unknown> | null } | null
  countryRestriction: string[] | null
  certificates: Record<string, string> | null
  color: string | null
  material: string | null
  application: string | null
  countryOfOrigin: string | null
  suitableFor: string | null
  finishing: string | null
  co2EmissionProduction: string | null
  co2EmissionTransport: string | null
  douProduct: boolean | null
  biodegradable: boolean | null
  handmade: boolean | null
  scratchProne: boolean | null
  typeOfClosure: string | null
  gemstoneType: string | null
  customizable: Record<string, unknown> | null
  accessories: unknown[] | null
  ringSizing: Record<string, unknown> | null
  capacity: number | null
  height: number | null
  width: number | null
  depth: number | null
  weight: number | null
  length: number | null
  thickness: number | null
  pimTemplate: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  updatedBy: string | null
}

export interface PaginatedPimProducts {
  data: PimProduct[]
  total: number
  page: number
  limit: number
}

export interface PimProductFilters {
  page?: number
  limit?: number
  search?: string
  status?: ProductStatus
  categoryId?: number
  inStock?: StockFilter
}

export interface BulkActionResult {
  success: number[]
  skipped: { id: number; reason: string }[]
}

export const getPimProducts = (params?: PimProductFilters) =>
  api.get<PaginatedPimProducts>('/products', { params })

export const archivePimProduct = (id: number) =>
  api.patch(`/products/${id}/archive`)

export const updatePimProductStatus = (id: number, status: ProductStatus) =>
  api.patch(`/products/${id}/status`, { status })

export const deletePimProduct = (id: number) =>
  api.delete(`/products/${id}`)

export const bulkArchivePimProducts = (ids: number[]) =>
  api.patch<BulkActionResult>('/products/bulk/archive', { ids })

export const bulkUpdatePimProductStatus = (ids: number[], status: ProductStatus) =>
  api.patch<BulkActionResult>('/products/bulk/status', { ids, status })

export const bulkDeletePimProducts = (ids: number[]) =>
  api.delete<BulkActionResult>('/products/bulk', { data: { ids } })

export const getPimProductById = (id: number) =>
  api.get<PimProduct>(`/products/${id}`)

export const createPimProduct = (body: Record<string, unknown>) =>
  api.post<PimProduct>('/products', body)

export const updatePimProduct = (id: number, body: Record<string, unknown>) =>
  api.patch<PimProduct>(`/products/${id}`, body)

export const exportPimProducts = (params?: Omit<PimProductFilters, 'page' | 'limit'>) =>
  api.get<Blob>('/products/export', { params, responseType: 'blob' })
