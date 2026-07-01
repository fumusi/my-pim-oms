import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  getNotifications,
  markAllRead,
  markRead,
  type Notification,
} from '../api/notifications'
import { relativeTime, TYPE_ICONS, entityRoute } from '../utils/notifications'
import { getApiError } from '../utils/format'

export function NotificationsPage() {
  const [page, setPage] = useState(1)
  const [isReadFilter, setIsReadFilter] = useState<boolean | undefined>(undefined)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const limit = 15

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'page', page, isReadFilter],
    queryFn: () =>
      getNotifications({ page, limit, isRead: isReadFilter }),
  })

  async function handleMarkAllRead() {
    await markAllRead()
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  async function handleItemClick(n: Notification) {
    const route = entityRoute(n)
    if (n.isRead) {
      if (route) void navigate({ to: route, params: { id: String(n.relatedEntityId) } })
      return
    }
    try {
      await markRead(n.id)
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      if (route) void navigate({ to: route, params: { id: String(n.relatedEntityId) } })
    } catch (err) {
      toast.error(getApiError(err))
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 1

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="mb-0" style={{ color: '#e8eaf0', fontSize: '1.25rem', fontWeight: 500 }}>
          Notifications
        </h2>
        <div className="d-flex gap-2">
          <select
            className="form-select form-select-sm"
            style={{ background: '#1a1b2e', color: '#c5c7d8', border: '1px solid rgba(255,255,255,0.1)', width: 'auto' }}
            value={isReadFilter === undefined ? '' : String(isReadFilter)}
            onChange={(e) => {
              setPage(1)
              if (e.target.value === '') setIsReadFilter(undefined)
              else setIsReadFilter(e.target.value === 'true')
            }}
          >
            <option value="">All</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </select>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={handleMarkAllRead}
          >
            Mark all read
          </button>
        </div>
      </div>

      {isLoading && (
        <div style={{ color: '#6b6e87', padding: '2rem 0', textAlign: 'center' }}>
          Loading…
        </div>
      )}

      {!isLoading && (!data || data.data.length === 0) && (
        <div style={{ color: '#6b6e87', padding: '2rem 0', textAlign: 'center' }}>
          No notifications
        </div>
      )}

      {data && data.data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {data.data.map((n) => {
            const interactive = !n.isRead || !!entityRoute(n)
            return (
              <div
                key={n.id}
                className={`notification-item${n.isRead ? '' : ' notification-item--unread'}`}
                style={{ cursor: interactive ? 'pointer' : 'default', borderRadius: 8 }}
                onClick={() => handleItemClick(n)}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                onKeyDown={(e) => { if (e.key === 'Enter' && interactive) void handleItemClick(n) }}
              >
                <span className="notification-item-icon" aria-hidden="true">
                  {TYPE_ICONS[n.type]}
                </span>
                <div className="notification-item-body">
                  <div className="notification-item-title">{n.title}</div>
                  <div className="notification-item-message">{n.message}</div>
                  <div className="notification-item-time">{relativeTime(n.createdAt)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="d-flex justify-content-center gap-2 mt-4">
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span style={{ color: '#9396a5', fontSize: '0.875rem', alignSelf: 'center' }}>
            {page} / {totalPages}
          </span>
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
