import { useState, useEffect, useRef } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import { getOrders, type OrderStatus, type DeliveryOption } from '../api/orders'
import { formatDate } from '../utils/format'

export function OrdersPage() {
  const navigate = useNavigate()
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'

  const { page, search, status, deliveryOption, dateFrom, dateTo, archived } = useSearch({
    from: '/app/orders',
  })
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
        to: '/orders',
        search: (prev) => ({ ...prev, search: searchInput || undefined, page: 1 }),
      })
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isError } = useQuery({
    queryKey: ['orders', page, limit, search, status, deliveryOption, dateFrom, dateTo, archived],
    queryFn: () =>
      getOrders({
        page,
        limit,
        search: search || undefined,
        status,
        deliveryOption,
        dateFrom,
        dateTo,
        archived: archived || undefined,
      }).then((r) => r.data),
  })

  function setFilter(
    updates: Partial<{
      status: typeof status
      deliveryOption: typeof deliveryOption
      dateFrom: string | undefined
      dateTo: string | undefined
    }>,
  ) {
    navigate({
      to: '/orders',
      search: (prev) => ({ ...prev, ...updates, page: 1 }),
    })
  }

  function setPage(p: number) {
    navigate({ to: '/orders', search: (prev) => ({ ...prev, page: p }) })
  }

  function setArchived(value: boolean) {
    navigate({ to: '/orders', search: (prev) => ({ ...prev, page: 1, archived: value }) })
  }

  const orders = data?.data ?? []
  const totalPages = data ? Math.ceil(data.total / limit) : 0

  return (
    <>
      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <div className="dash-card-title">Orders</div>
            <div className="dash-card-sub">
              {data ? `${data.total} order${data.total === 1 ? '' : 's'}` : 'Loading…'}
            </div>
          </div>
          <button
            className="exact-btn exact-btn-primary"
            onClick={() => navigate({ to: '/orders/new' })}
          >
            + New Order
          </button>
        </div>

        <div className="orders-tabs">
          <button
            className={`orders-tab${!archived ? ' orders-tab--active' : ''}`}
            onClick={() => setArchived(false)}
          >
            Active Orders
          </button>
          <button
            className={`orders-tab${archived ? ' orders-tab--active' : ''}`}
            onClick={() => setArchived(true)}
          >
            Archived Orders
          </button>
        </div>

        <div className="cust-filters">
          <input
            className="cust-filter-input"
            type="text"
            placeholder="Search orders…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <select
            className="cust-filter-select"
            value={status ?? ''}
            onChange={(e) =>
              setFilter({ status: (e.target.value || undefined) as typeof status })
            }
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="partial">Partial</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            className="cust-filter-select"
            value={deliveryOption ?? ''}
            onChange={(e) =>
              setFilter({
                deliveryOption: (e.target.value || undefined) as typeof deliveryOption,
              })
            }
          >
            <option value="">All delivery options</option>
            <option value="dhl">DHL</option>
            <option value="ups">UPS</option>
            <option value="pickup">Pickup</option>
          </select>
        </div>

        {isLoading && !data && (
          <div className="profile-loading">
            <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
          </div>
        )}

        {isError && (
          <div className="profile-loading">
            <p style={{ color: '#f87171' }}>Failed to load orders.</p>
          </div>
        )}

        {!isLoading && !isError && orders.length === 0 && (
          <div className="profile-loading">
            <p style={{ color: '#6b6e87' }}>No orders found</p>
          </div>
        )}

        {!isError && orders.length > 0 && (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Delivery</th>
                  <th>Total incl. VAT</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  return (
                    <tr
                      key={o.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate({ to: '/orders/$id', params: { id: String(o.id) } })}
                    >
                      <td className="users-td-muted" style={{ fontSize: '0.78rem' }}>
                        {o.orderNumber}
                      </td>
                      <td style={{ fontWeight: 500, color: '#e0e2f0' }}>
                        {o.createdByName ?? o.createdBy ?? '—'}
                      </td>
                      <td>
                        <span
                          className={`order-status-badge order-status-${o.status}`}
                        >
                          {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                        </span>
                      </td>
                      <td className="users-td-muted">
                        {o.deliveryOption.charAt(0).toUpperCase() + o.deliveryOption.slice(1)}
                      </td>
                      <td className="users-td-muted">
                        {o.totalInclVat != null ? '€' + o.totalInclVat.toFixed(2) : '—'}
                      </td>
                      <td className="users-td-muted">{formatDate(o.createdAt)}</td>
                    </tr>
                  )
                })}
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

    </>
  )
}
