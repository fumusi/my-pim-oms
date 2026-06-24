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

export interface ExactItemDetail {
  id: string
  code: string | null
  description: string | null
  extraDescription: string | null
  notes: string | null
  searchCode: string | null
  barcode: string | null
  itemGroupDescription: string | null
  itemGroupCode: string | null
  itemGroup: { id: string; description: string | null } | null
  salesVatCode: string | null
  salesVatCodeDescription: string | null
  standardSalesPrice: number | null
  costPriceStandard: number | null
  costPriceCurrency: string | null
  unit: string | null
  unitDescription: string | null
  stock: number | null
  isSalesItem: boolean | null
  isStockItem: boolean | null
  isPurchaseItem: boolean | null
  isWebshopItem: boolean | null
  isFractionAllowedItem: boolean | null
  pictureUrl: string | null
  startDate: string | null
  endDate: string | null
  pimTemplate: Record<string, unknown> | null
  creatorFullName: string | null
  modifierFullName: string | null
  created: string | null
  modified: string | null
}

export interface PaginatedProducts {
  data: Product[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export const getProducts = (params?: { page?: number; limit?: number; excludeCategoryId?: number; search?: string; withCategory?: boolean }) =>
  api.get<PaginatedProducts>('/items', { params })

export const getExactItemById = (id: string) =>
  api.get<ExactItemDetail>(`/items/${id}`)
