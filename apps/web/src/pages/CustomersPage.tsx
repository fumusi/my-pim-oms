import { useState, useEffect, useRef } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import {
  getCustomers,
  type Customer,
  type CustomerStatus,
} from '../api/customers'
import { CustomerDrawer } from '../components/CustomerDrawer'
import { formatDate } from '../utils/format'

function StatusBadge({ status }: { status: CustomerStatus }) {
  if (status === 'active') return <span className="cust-status-badge cust-status-active">Active</span>
  if (status === 'inactive') return <span className="cust-status-badge cust-status-inactive">Inactive</span>
  return <span className="cust-status-badge cust-status-archived">Archived</span>
}

export function CustomersPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'

  const { page, search, status, country } = useSearch({ from: '/app/customers' })
  const limit = 20

  const [searchInput, setSearchInput] = useState(search ?? '')
  const [countryInput, setCountryInput] = useState(country ?? '')

  const [createOpen, setCreateOpen] = useState(false)

  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    const t = setTimeout(() => {
      navigate({
        to: '/customers',
        search: (prev) => ({ ...prev, search: searchInput || undefined, page: 1 }),
      })
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

  const countryMountedRef = useRef(false)
  useEffect(() => {
    if (!countryMountedRef.current) {
      countryMountedRef.current = true
      return
    }
    const t = setTimeout(() => {
      setFilter({ country: countryInput || undefined })
    }, 300)
    return () => clearTimeout(t)
  }, [countryInput]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customers', page, limit, search, status, country],
    queryFn: () =>
      getCustomers({ page, limit, search: search || undefined, status, country }).then((r) => r.data),
  })

  function setFilter(updates: Partial<{ status: CustomerStatus | undefined; country: string | undefined }>) {
    navigate({
      to: '/customers',
      search: (prev) => ({ ...prev, ...updates, page: 1 }),
    })
  }

  function setPage(p: number) {
    navigate({ to: '/customers', search: (prev) => ({ ...prev, page: p }) })
  }

  const customers = data?.data ?? []
  const totalPages = data ? Math.ceil(data.total / limit) : 0

  return (
    <>
      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <div className="dash-card-title">Customers</div>
            <div className="dash-card-sub">
              {data ? `${data.total} customer${data.total === 1 ? '' : 's'}` : 'Loading…'}
            </div>
          </div>
          {isAdmin && (
            <button
              className="exact-btn exact-btn-primary"
              onClick={() => setCreateOpen(true)}
            >
              + New customer
            </button>
          )}
        </div>

        <div className="cust-filters">
          <input
            className="cust-filter-input"
            type="text"
            placeholder="Search customers…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <select
            className="cust-filter-select"
            value={status ?? ''}
            onChange={(e) =>
              setFilter({ status: (e.target.value || undefined) as CustomerStatus | undefined })
            }
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
          <input
            className="cust-filter-input"
            type="text"
            placeholder="Country"
            value={countryInput}
            onChange={(e) => setCountryInput(e.target.value)}
          />
        </div>

        {isLoading && !data && (
          <div className="profile-loading">
            <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
          </div>
        )}

        {isError && (
          <div className="profile-loading">
            <p style={{ color: '#f87171' }}>Failed to load customers.</p>
          </div>
        )}

        {!isLoading && !isError && customers.length === 0 && (
          <div className="profile-loading">
            <p style={{ color: '#6b6e87' }}>No customers found</p>
          </div>
        )}

        {!isError && customers.length > 0 && (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name / Company</th>
                  <th>Email</th>
                  <th>Country</th>
                  <th>Status</th>
                  <th>Orders</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate({ to: '/customers/$id', params: { id: String(c.id) } })}
                  >
                    <td className="users-td-muted" style={{ fontSize: '0.78rem' }}>
                      {c.customerNumber}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#e0e2f0' }}>{c.name}</div>
                      {c.companyName && (
                        <div style={{ fontSize: '0.75rem', color: '#6b6e87', marginTop: 2 }}>
                          {c.companyName}
                        </div>
                      )}
                    </td>
                    <td className="users-td-muted">{c.email}</td>
                    <td className="users-td-muted">{c.country}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="users-td-muted">—</td>
                    <td className="users-td-muted">{formatDate(c.createdAt)}</td>
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

      {createOpen && (
        <CustomerDrawer
          customer={null}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['customers'] })
            setCreateOpen(false)
          }}
        />
      )}
    </>
  )
}
