import { api } from './client'

export interface Notification {
  id: number
  // keep in sync with NotificationType in apps/api/src/common/enums/notification-type.enum.ts
  type: 'low_stock' | 'out_of_stock' | 'new_order' | 'order_status_change'
  title: string
  message: string
  relatedEntityType: string | null
  relatedEntityId: number | null
  isRead: boolean
  createdAt: string
}

export interface PaginatedNotifications {
  data: Notification[]
  total: number
  page: number
  limit: number
}

export const getNotifications = (params?: {
  page?: number
  limit?: number
  isRead?: boolean
  type?: string
}): Promise<PaginatedNotifications> =>
  api.get<PaginatedNotifications>('/notifications', { params }).then((r) => r.data)

export const getUnreadCount = (): Promise<{ count: number }> =>
  api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data)

export const markRead = (id: number): Promise<void> =>
  api.patch(`/notifications/${id}/read`).then(() => undefined)

export const markAllRead = (): Promise<void> =>
  api.patch('/notifications/read-all').then(() => undefined)
