import type { PriceListStatus } from '../api/price-lists'

export function PriceListStatusBadge({
  status,
  archivedAt,
}: {
  status: PriceListStatus
  archivedAt: string | null
}) {
  if (archivedAt) return <span className="cust-status-badge cust-status-archived">Archived</span>
  if (status === 'active') return <span className="cust-status-badge cust-status-active">Active</span>
  return <span className="cust-status-badge cust-status-inactive">Inactive</span>
}

export function PriceListActiveNowBadge({
  status,
  archivedAt,
  startDate,
  endDate,
  style,
}: {
  status: PriceListStatus
  archivedAt: string | null
  startDate: string | null
  endDate: string | null
  style?: React.CSSProperties
}) {
  const today = new Date().toISOString().slice(0, 10)
  const afterStart = !startDate || today >= startDate
  const beforeEnd = !endDate || today <= endDate
  if (archivedAt || status !== 'active' || !afterStart || !beforeEnd) return null
  return (
    <span className="cust-status-badge cust-status-active" style={{ fontSize: '0.7rem', ...style }}>
      Active now
    </span>
  )
}

export function PriceListSectionCard({
  title,
  children,
  action,
}: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="dash-card">
      <div className="cust-section-header">
        <div className="dash-card-title">{title}</div>
        {action}
      </div>
      {children}
    </div>
  )
}
