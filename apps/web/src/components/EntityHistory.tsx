import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getEntityHistory, type AuditLog } from '../api/audit-logs'
import { ActionBadge } from './ActionBadge'
import { AuditDiff, AuditSnapshot } from './AuditDiff'
import { formatTimestamp } from '../utils/format'

function HistoryEntry({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails =
    log.action === 'update'
      ? !!(log.changedFields && Object.keys(log.changedFields).length > 0)
      : !!(log.metadata && Object.keys(log.metadata).length > 0)

  return (
    <div
      style={{
        borderLeft: '2px solid rgba(124, 58, 237, 0.3)',
        paddingLeft: '1rem',
        marginBottom: '0.75rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
          cursor: (hasDetails) ? 'pointer' : 'default',
        }}
        onClick={() => (hasDetails) ? setExpanded((v) => !v) : undefined}
      >
        <span className="users-td-muted" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
          {formatTimestamp(log.performedAt)}
        </span>
        <ActionBadge action={log.action} />
        <span style={{ fontSize: '0.8rem', color: '#6b6e87' }}>
          by <span style={{ color: '#c5c7d8' }}>{log.performedBy}</span>
        </span>
        {(hasDetails) && (
          <span style={{ fontSize: '0.75rem', color: '#7c3aed', marginLeft: 'auto' }}>
            {expanded ? '▲' : '▶'}
          </span>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: '0.5rem' }}>
          {log.action === 'update' && (
            log.changedFields && Object.keys(log.changedFields).length > 0
              ? <AuditDiff changedFields={log.changedFields} />
              : <p style={{ color: '#6b6e87', margin: 0, fontSize: '0.8rem' }}>No changes recorded.</p>
          )}
          {log.action === 'status_change' && log.metadata && (
            <div style={{ fontSize: '0.85rem', color: '#c5c7d8' }}>
              Status:{' '}
              <span style={{ color: '#f87171', fontWeight: 500 }}>{String(log.metadata.from ?? '—')}</span>
              {' → '}
              <span style={{ color: '#34d399', fontWeight: 500 }}>{String(log.metadata.to ?? '—')}</span>
            </div>
          )}
          {(log.action === 'create' || log.action === 'delete' || log.action === 'archive') &&
            log.metadata?.snapshot && typeof log.metadata.snapshot === 'object' && (
              <AuditSnapshot snapshot={log.metadata.snapshot as Record<string, unknown>} />
            )}
        </div>
      )}
    </div>
  )
}

export function EntityHistory({
  entityType,
  entityId,
}: {
  entityType: string
  entityId: number
}) {
  const [isOpen, setIsOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['entity-history', entityType, entityId],
    queryFn: () => getEntityHistory(entityType, entityId),
    enabled: isOpen,
  })

  return (
    <div className="dash-card" style={{ marginTop: '1rem' }}>
      <button
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
        onClick={() => setIsOpen((v) => !v)}
      >
        <span className="dash-card-title" style={{ margin: 0 }}>History</span>
        <span style={{ color: '#6b6e87', fontSize: '0.85rem' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div style={{ marginTop: '1rem' }}>
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
              <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
            </div>
          )}

          {!isLoading && data && data.length === 0 && (
            <p style={{ color: '#6b6e87', margin: 0, fontSize: '0.85rem' }}>No history yet.</p>
          )}

          {!isLoading && data && data.length > 0 && (
            <div>
              {data.map((log) => (
                <HistoryEntry key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
