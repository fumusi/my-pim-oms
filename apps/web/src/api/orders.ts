import { api } from './client'
import type { Customer } from './customers'

export type OrderStatus = 'draft' | 'open' | 'partial' | 'completed' | 'cancelled'
export type DeliveryOption = 'dhl' | 'ups' | 'pickup'

export interface ShippingAddress {
  id: number
  street: string
  houseNumber: string
  postalCode: string
  city: string
  province: string | null
  country: string
}

export interface LineItem {
  id: number
  productId: number
  productName: string
  sku: string | null
  quantity: number
  unitPrice: number
  discount: number
  lineTotalExclVat: number
  isFulfillable: boolean
}

export interface Order {
  id: number
  orderNumber: string
  customerId: number
  customer: Customer
  shippingAddress: ShippingAddress
  status: OrderStatus
  deliveryOption: DeliveryOption
  orderSource: string
  description: string | null
  trackingUrl: string | null
  vatPercentage: number | null
  vatAmount: number | null
  totalExclVat: number | null
  totalInclVat: number | null
  shippingCost: number
  freeShippingApplied: boolean
  archiveReason: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
  lineItems: LineItem[]
}

export interface PaginatedOrders {
  data: Order[]
  total: number
  page: number
  limit: number
}

export interface OrdersQuery {
  page?: number
  limit?: number
  search?: string
  status?: OrderStatus
  deliveryOption?: DeliveryOption
  dateFrom?: string
  dateTo?: string
  archived?: boolean
}

export const getOrders = (q: OrdersQuery) =>
  api.get<PaginatedOrders>('/orders', { params: q })

export const updateOrderStatus = (id: number, status: OrderStatus) =>
  api.patch<Order>(`/orders/${id}/status`, { status })

export const archiveOrder = (id: number, archiveReason: string) =>
  api.patch<Order>(`/orders/${id}/archive`, { archiveReason })

export const getOrder = (id: number) =>
  api.get<Order>(`/orders/${id}`)

export const downloadInvoice = (id: number, orderNumber: string) =>
  api.get(`/orders/${id}/invoice`, { responseType: 'blob' }).then((res) => {
    const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice-${orderNumber}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  })
