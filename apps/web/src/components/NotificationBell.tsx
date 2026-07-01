import { useRef, useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  type Notification,
} from '../api/notifications'
import { relativeTime, TYPE_ICONS, entityRoute } from '../utils/notifications'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: countData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 30_000,
  })

  const { data: listData } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => getNotifications({ limit: 15 }),
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const count = countData?.count ?? 0

  async function handleMarkAllRead() {
    await markAllRead()
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  async function handleItemClick(n: Notification) {
    await markRead(n.id)
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    setOpen(false)
    const route = entityRoute(n)
    if (route) {
      // relatedEntityType is limited to 'Order' | 'Product' today; extend entityRoute if more types are added
      void navigate({ to: route, params: { id: String(n.relatedEntityId) } })
    }
  }

  return (
    <div className="notification-bell" ref={wrapperRef}>
      <button
        className="notification-bell-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="notification-badge">{count > 99 ? '99+' : count}</span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span className="notification-dropdown-title">Notifications</span>
            <button
              className="notification-mark-all-btn"
              onClick={handleMarkAllRead}
              disabled={count === 0}
            >
              Mark all read
            </button>
          </div>

          <div className="notification-list">
            {!listData || listData.data.length === 0 ? (
              <div className="notification-empty">No notifications</div>
            ) : (
              listData.data.map((n) => (
                <div
                  key={n.id}
                  className={`notification-item${n.isRead ? '' : ' notification-item--unread'}`}
                  onClick={() => handleItemClick(n)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleItemClick(n) }}
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
              ))
            )}
          </div>

          <div className="notification-dropdown-footer">
            <a
              href="/notifications"
              className="notification-view-all"
              onClick={(e) => {
                e.preventDefault()
                setOpen(false)
                void navigate({ to: '/notifications' })
              }}
            >
              View all
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
