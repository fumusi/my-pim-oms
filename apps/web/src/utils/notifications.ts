import type { Notification } from '../api/notifications'

export function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export const TYPE_ICONS: Record<Notification['type'], string> = {
  low_stock: '⚠️',
  out_of_stock: '🔴',
  new_order: '🛒',
  order_status_change: '📋',
}

export function entityRoute(n: Notification): '/orders/$id' | '/products/$id' | null {
  if (!n.relatedEntityType || !n.relatedEntityId) return null
  if (n.relatedEntityType === 'Order') return '/orders/$id'
  if (n.relatedEntityType === 'Product') return '/products/$id'
  return null
}
