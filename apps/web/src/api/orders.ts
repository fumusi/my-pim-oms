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
  createdByName: string | null
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

export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  draft: ['open'],
  open: ['partial', 'completed', 'cancelled'],
  partial: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

export interface CreateOrderBody {
  customerId?: number
  shippingAddressId?: number
  deliveryOption: DeliveryOption
  description?: string | null
  vatPercentage?: number | null
  shippingCost?: number
  lineItems: Array<{
    productId: number
    quantity: number
    discount: number
  }>
  onBehalfOf?: string
  newAddress?: {
    street: string
    houseNumber: string
    postalCode: string
    city: string
    province?: string
    country: string
  }
}

export interface UpdateOrderBody {
  description?: string | null
  deliveryOption?: DeliveryOption
  trackingUrl?: string | null
  shippingAddressId?: number
  shippingCost?: number
}

export interface AddLineItemBody {
  productId: number
  quantity: number
  discount: number
}

export interface UpdateLineItemBody {
  quantity?: number
  discount?: number
}

export interface RevenueSummary {
  totalRevenue: number
  monthlyRevenue: Array<{ month: string; revenue: number }>
}

export const getOrdersRevenue = () =>
  api.get<RevenueSummary>('/orders/revenue')

export const getOrders = (q: OrdersQuery) =>
  api.get<PaginatedOrders>('/orders', { params: q })

export const updateOrderStatus = (id: number, status: OrderStatus) =>
  api.patch<Order>(`/orders/${id}/status`, { status })

export const archiveOrder = (id: number, archiveReason: string) =>
  api.patch<Order>(`/orders/${id}/archive`, { archiveReason })

export const getOrder = (id: number) =>
  api.get<Order>(`/orders/${id}`)

export const createOrder = (body: CreateOrderBody) =>
  api.post<Order>('/orders', body)

export const updateOrder = (id: number, body: UpdateOrderBody) =>
  api.patch<Order>(`/orders/${id}`, body)

export const addLineItem = (orderId: number, body: AddLineItemBody) =>
  api.post<LineItem>(`/orders/${orderId}/items`, body)

export const updateLineItem = (orderId: number, itemId: number, body: UpdateLineItemBody) =>
  api.patch<LineItem>(`/orders/${orderId}/items/${itemId}`, body)

export const removeLineItem = (orderId: number, itemId: number) =>
  api.delete(`/orders/${orderId}/items/${itemId}`)

export const downloadInvoice = (id: number, orderNumber: string) =>
  api.get(`/orders/${id}/invoice`, { responseType: 'blob' }).then((res) => {
    const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice-${orderNumber}.pdf`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 100)
  })
