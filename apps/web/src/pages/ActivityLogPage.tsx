import { useState, useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getAuditLogs, type AuditLog, type AuditAction } from '../api/audit-logs'
import { ActionBadge } from '../components/ActionBadge'
import { AuditDiff, AuditSnapshot } from '../components/AuditDiff'

const ENTITY_TYPES = ['Product', 'Category', 'Customer', 'Order', 'PriceList', 'User']
const ACTIONS: AuditAction[] = ['create', 'update', 'delete', 'archive', 'status_change']

const ENTITY_ROUTE_MAP: Record<string, string | null> = {
  Product: '/products',
  Category: '/categories',
  Customer: '/customers',
  Order: '/orders',
  PriceList: '/price-lists',
  User: '/users',
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function EntityLink({ entityType, entityId }: { entityType: string; entityId: number }) {
  const base = ENTITY_ROUTE_MAP[entityType]
  if (!base) return <span>{entityId}</span>
  if (entityType === 'User') {
    return <Link to="/users" style={{ color: '#a78bfa' }}>{entityId}</Link>
  }
  return (
    <Link
      to={`${base}/$id` as '/products/$id' | '/categories/$id' | '/customers/$id' | '/orders/$id' | '/price-lists/$id'}
      params={{ id: String(entityId) }}
      style={{ color: '#a78bfa' }}
    >
      {entityId}
    </Link>
  )
}

function ExpandedRow({ log }: { log: AuditLog }) {
  if (log.action === 'update') {
    return log.changedFields && Object.keys(log.changedFields).length > 0
      ? <AuditDiff changedFields={log.changedFields} />
      : <p style={{ color: '#6b6e87', margin: 0, fontSize: '0.85rem' }}>No changes recorded.</p>
  }

  if (log.action === 'status_change') {
    const from = String(log.metadata?.from ?? '—')
    const to = String(log.metadata?.to ?? '—')
    return (
      <div style={{ fontSize: '0.85rem', color: '#c5c7d8' }}>
        Status:{' '}
        <span style={{ color: '#f87171', fontWeight: 500 }}>{from}</span>
        {' → '}
        <span style={{ color: '#34d399', fontWeight: 500 }}>{to}</span>
      </div>
    )
  }

  // create / delete / archive — show snapshot
  const snapshot = log.metadata?.snapshot
  if (snapshot && typeof snapshot === 'object') {
    return <AuditSnapshot snapshot={snapshot as Record<string, unknown>} />
  }

  return <p style={{ color: '#6b6e87', margin: 0, fontSize: '0.85rem' }}>No details available.</p>
}

function LogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr>
        <td className="users-td-muted" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
          {formatTimestamp(log.performedAt)}
        </td>
        <td>
          <span className="badge bg-secondary">{log.entityType}</span>
        </td>
        <td>
          <EntityLink entityType={log.entityType} entityId={log.entityId} />
        </td>
        <td>
          <ActionBadge action={log.action} />
        </td>
        <td className="users-td-muted" style={{ fontSize: '0.85rem' }}>
          {log.performedBy}
        </td>
        <td>
          <button
            className="exact-btn exact-btn-outline"
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? '▼ Details' : '▶ Details'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} style={{ background: 'rgba(124, 58, 237, 0.05)', padding: '0.75rem 1rem' }}>
            <ExpandedRow log={log} />
          </td>
        </tr>
      )}
    </>
  )
}

export function ActivityLogPage() {
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const [performedByInput, setPerformedByInput] = useState('')
  const [performedBy, setPerformedBy] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    const t = setTimeout(() => {
      setPerformedBy(performedByInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [performedByInput])

  const filters = {
    entityType: entityType || undefined,
    action: (action || undefined) as AuditAction | undefined,
    performedBy: performedBy || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit,
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => getAuditLogs(filters),
  })

  function clearFilters() {
    setEntityType('')
    setAction('')
    setPerformedByInput('')
    setPerformedBy('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const logs = data?.data ?? []
  const totalPages = data ? Math.ceil(data.total / limit) : 0

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <div>
          <div className="dash-card-title">Activity Log</div>
          <div className="dash-card-sub">
            {data ? `${data.total} entr${data.total === 1 ? 'y' : 'ies'}` : 'Loading…'}
          </div>
        </div>
      </div>

      <div className="cust-filters" style={{ flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <select
          className="cust-filter-select"
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1) }}
        >
          <option value="">All entity types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          className="cust-filter-select"
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1) }}
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{a.replace('_', ' ')}</option>
          ))}
        </select>

        <input
          className="cust-filter-input"
          type="text"
          placeholder="Performed by…"
          value={performedByInput}
          onChange={(e) => setPerformedByInput(e.target.value)}
        />

        <input
          className="cust-filter-input"
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
          style={{ maxWidth: '140px' }}
        />

        <input
          className="cust-filter-input"
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
          style={{ maxWidth: '140px' }}
        />

        <button className="exact-btn exact-btn-outline" onClick={clearFilters}>
          Clear filters
        </button>
      </div>

      {isLoading && !data && (
        <div className="profile-loading">
          <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
        </div>
      )}

      {isError && (
        <div className="profile-loading">
          <p style={{ color: '#f87171' }}>Failed to load activity log.</p>
        </div>
      )}

      {!isLoading && !isError && logs.length === 0 && (
        <div className="profile-loading" style={{ flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>📋</span>
          <p style={{ color: '#6b6e87', margin: 0 }}>No activity found</p>
        </div>
      )}

      {!isError && logs.length > 0 && (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Entity Type</th>
                <th>Entity ID</th>
                <th>Action</th>
                <th>Performed By</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && totalPages > 1 && (
        <div className="users-pagination">
          <span className="users-pagination-info">
            Page {data.page} of {totalPages} · {data.total} total
          </span>
          <div className="users-pagination-btns">
            <button
              className="users-pg-btn"
              disabled={data.page <= 1}
              onClick={() => setPage(data.page - 1)}
            >
              ‹ Prev
            </button>
            <button
              className="users-pg-btn"
              disabled={data.page >= totalPages}
              onClick={() => setPage(data.page + 1)}
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
