import type { AuditAction } from '../api/audit-logs'

const ACTION_MAP: Record<AuditAction, { className: string; style?: React.CSSProperties }> = {
  create: { className: 'badge bg-success' },
  update: { className: 'badge bg-primary' },
  delete: { className: 'badge bg-danger' },
  archive: { className: 'badge bg-warning text-dark' },
  status_change: { className: 'badge', style: { backgroundColor: '#6f42c1' } },
}

export function ActionBadge({ action }: { action: AuditAction }) {
  const { className, style } = ACTION_MAP[action] ?? { className: 'badge bg-secondary' }
  return (
    <span className={className} style={style}>
      {action.replace('_', ' ')}
    </span>
  )
}
