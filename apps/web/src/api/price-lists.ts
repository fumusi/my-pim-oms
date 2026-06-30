import { api } from './client'

export type PriceListStatus = 'active' | 'inactive'

export interface PriceList {
  id: number
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  status: PriceListStatus
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
  archivedAt: string | null
}

export interface PriceListItem {
  id: number
  priceListId: number
  productId: number
  customPrice: number
  discount: number | null
  product: {
    id: number
    name: { nl?: string; en?: string; de?: string } | null
    barcode: string | null
    basePrice: number | null
  } | null
}

export interface AssignedCustomer {
  customerId: number
  customerName: string
  customerEmail: string
  assignedAt: string
  assignedBy: string | null
}

export interface PriceListDetail extends PriceList {
  customerCount: number
  items: PriceListItem[]
}

export interface PaginatedPriceLists {
  data: PriceList[]
  total: number
  page: number
  limit: number
}

export interface GetPriceListsParams {
  page?: number
  limit?: number
  search?: string
  status?: PriceListStatus
  activeNow?: boolean
  archived?: boolean
}

export interface CreatePriceListBody {
  name: string
  description?: string
  startDate?: string
  endDate?: string
}

export interface UpdatePriceListBody {
  name?: string
  description?: string | null
  startDate?: string | null
  endDate?: string | null
}

export const getPriceLists = (params: GetPriceListsParams) =>
  api.get<PaginatedPriceLists>('/price-lists', { params }).then((r) => r.data)

export const getPriceList = (id: number) =>
  api.get<PriceListDetail>(`/price-lists/${id}`).then((r) => r.data)

export const createPriceList = (body: CreatePriceListBody) =>
  api.post<PriceList>('/price-lists', body).then((r) => r.data)

export const updatePriceList = (id: number, body: UpdatePriceListBody) =>
  api.patch<PriceList>(`/price-lists/${id}`, body).then((r) => r.data)

export const updatePriceListStatus = (id: number, status: PriceListStatus) =>
  api.patch<PriceList>(`/price-lists/${id}/status`, { status }).then((r) => r.data)

export const archivePriceList = (id: number) =>
  api.patch(`/price-lists/${id}/archive`)

export const deletePriceList = (id: number) =>
  api.delete(`/price-lists/${id}`)

export const getPriceListCustomers = (id: number) =>
  api.get<AssignedCustomer[]>(`/price-lists/${id}/customers`).then((r) => r.data)

export const addPriceListItem = (
  priceListId: number,
  body: { productId: number; customPrice: number; discount?: number },
) => api.post(`/price-lists/${priceListId}/items`, body).then((r) => r.data)

export const updatePriceListItem = (
  priceListId: number,
  itemId: number,
  body: { customPrice?: number; discount?: number | null },
) => api.patch(`/price-lists/${priceListId}/items/${itemId}`, body).then((r) => r.data)

export const removePriceListItem = (priceListId: number, itemId: number) =>
  api.delete(`/price-lists/${priceListId}/items/${itemId}`)

export const bulkAddPriceListItems = (
  priceListId: number,
  body: { items: Array<{ productId: number; customPrice: number; discount?: number }> },
) =>
  api.post<{ added: number; skipped: number }>(`/price-lists/${priceListId}/items/bulk`, body).then(
    (r) => r.data,
  )

export const unassignCustomerFromPriceList = (priceListId: number, customerId: number) =>
  api.delete(`/price-lists/${priceListId}/customers/${customerId}`)

export const assignCustomerToPriceList = (priceListId: number, customerId: number) =>
  api.post(`/price-lists/${priceListId}/customers`, { customerId }).then((r) => r.data)

export const getAssignedCustomerIds = () =>
  api.get<number[]>('/price-lists/assigned-customer-ids').then((r) => r.data)

export interface ResolvedPrice {
  effectivePrice: number
  source: 'price_list' | 'base_price'
  priceListName?: string
}

export const resolvePrice = (productId: number, customerId?: number) =>
  api.get<ResolvedPrice>('/price-lists/resolve', { params: { productId, customerId } }).then((r) => r.data)
