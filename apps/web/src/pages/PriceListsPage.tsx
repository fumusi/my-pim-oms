import { useState, useEffect, useRef } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import {
  getPriceLists,
  type PriceList,
  type PriceListStatus,
} from '../api/price-lists'
import { PriceListDrawer } from '../components/PriceListDrawer'

function StatusBadge({
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

function ActiveNowBadge({
  startDate,
  endDate,
}: {
  startDate: string | null
  endDate: string | null
}) {
  const today = new Date().toISOString().slice(0, 10)
  const afterStart = !startDate || today >= startDate
  const beforeEnd = !endDate || today <= endDate
  if (!afterStart || !beforeEnd) return null
  return (
    <span
      className="cust-status-badge cust-status-active"
      style={{ marginLeft: 6, fontSize: '0.7rem' }}
    >
      Active now
    </span>
  )
}

export function PriceListsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'

  const { page, search, status, activeNow } = useSearch({ from: '/app/price-lists' })
  const limit = 20

  const [searchInput, setSearchInput] = useState(search ?? '')
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    const t = setTimeout(() => {
      navigate({
        to: '/price-lists',
        search: (prev) => ({ ...prev, search: searchInput || undefined, page: 1 }),
      })
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isError } = useQuery({
    queryKey: ['price-lists', page, limit, search, status, activeNow],
    queryFn: () =>
      getPriceLists({ page, limit, search: search || undefined, status, activeNow }),
  })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PriceList | null>(null)

  function setFilter(
    updates: Partial<{ status: PriceListStatus | undefined; activeNow: boolean | undefined }>,
  ) {
    navigate({ to: '/price-lists', search: (prev) => ({ ...prev, ...updates, page: 1 }) })
  }

  function setPage(p: number) {
    navigate({ to: '/price-lists', search: (prev) => ({ ...prev, page: p }) })
  }

  const priceLists = data?.data ?? []
  const totalPages = data ? Math.ceil(data.total / limit) : 0

  return (
    <>
      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <div className="dash-card-title">Price Lists</div>
            <div className="dash-card-sub">
              {data ? `${data.total} price list${data.total === 1 ? '' : 's'}` : 'Loading…'}
            </div>
          </div>
          {isAdmin && (
            <button
              className="exact-btn exact-btn-primary"
              onClick={() => {
                setEditTarget(null)
                setDrawerOpen(true)
              }}
            >
              + New price list
            </button>
          )}
        </div>

        <div className="cust-filters">
          <input
            className="cust-filter-input"
            type="text"
            placeholder="Search price lists…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <select
            className="cust-filter-select"
            value={status ?? ''}
            onChange={(e) =>
              setFilter({ status: (e.target.value || undefined) as PriceListStatus | undefined })
            }
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#9396a5',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={activeNow ?? false}
              onChange={(e) => setFilter({ activeNow: e.target.checked || undefined })}
            />
            Currently active
          </label>
        </div>

        {isLoading && !data && (
          <div className="profile-loading">
            <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
          </div>
        )}

        {isError && (
          <div className="profile-loading">
            <p style={{ color: '#f87171' }}>Failed to load price lists.</p>
          </div>
        )}

        {!isLoading && !isError && priceLists.length === 0 && (
          <div className="profile-loading">
            <p style={{ color: '#6b6e87' }}>No price lists found</p>
          </div>
        )}

        {!isError && priceLists.length > 0 && (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Start date</th>
                  <th>End date</th>
                  <th>Period</th>
                  <th>Customers</th>
                </tr>
              </thead>
              <tbody>
                {priceLists.map((pl) => (
                  <tr
                    key={pl.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate({ to: '/price-lists/$id', params: { id: String(pl.id) } })}
                  >
                    <td className="users-td-muted" style={{ fontSize: '0.78rem' }}>
                      {pl.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#e0e2f0' }}>{pl.name}</div>
                      {pl.description && (
                        <div style={{ fontSize: '0.75rem', color: '#6b6e87', marginTop: 2 }}>
                          {pl.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={pl.status} archivedAt={pl.archivedAt} />
                    </td>
                    <td className="users-td-muted">{pl.startDate ?? '—'}</td>
                    <td className="users-td-muted">{pl.endDate ?? '—'}</td>
                    <td>
                      <ActiveNowBadge startDate={pl.startDate} endDate={pl.endDate} />
                    </td>
                    <td className="users-td-muted">—</td>
                  </tr>
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

      {drawerOpen && (
        <PriceListDrawer
          priceList={editTarget}
          onClose={() => {
            setDrawerOpen(false)
            setEditTarget(null)
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['price-lists'] })
            setDrawerOpen(false)
            setEditTarget(null)
          }}
        />
      )}
    </>
  )
}
