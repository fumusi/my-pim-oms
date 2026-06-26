import { useState, useEffect, useRef } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import type { RootState } from '../store'
import {
  getOrders,
  updateOrderStatus,
  archiveOrder,
  type Order,
  type OrderStatus,
} from '../api/orders'
import { formatDate, getApiError } from '../utils/format'

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  draft: ['open'],
  open: ['partial', 'completed', 'cancelled'],
  partial: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

function UpdateStatusModal({
  order,
  onClose,
  onSaved,
}: {
  order: Order
  onClose: () => void
  onSaved: () => void
}) {
  const queryClient = useQueryClient()
  const options = NEXT_STATUSES[order.status]
  const [selected, setSelected] = useState<OrderStatus>(options[0])

  const { mutate, isPending } = useMutation({
    mutationFn: () => updateOrderStatus(order.id, selected),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      onSaved()
    },
    onError: (err) => {
      toast.error(getApiError(err))
    },
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Update Status</div>
        <p className="modal-msg">
          Order <strong>{order.orderNumber}</strong> — current status:{' '}
          <strong>{order.status}</strong>
        </p>
        <div className="modal-field">
          <label className="modal-label">New status</label>
          <select
            className="modal-select"
            value={selected}
            onChange={(e) => setSelected(e.target.value as OrderStatus)}
          >
            {options.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onClose} disabled={isPending}>
            Cancel
          </button>
          <button
            className="modal-btn-confirm"
            onClick={() => mutate()}
            disabled={isPending}
          >
            {isPending ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ArchiveModal({
  order,
  onClose,
  onSaved,
}: {
  order: Order
  onClose: () => void
  onSaved: () => void
}) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => archiveOrder(order.id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      onSaved()
    },
    onError: (err) => {
      toast.error(getApiError(err))
    },
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Archive Order</div>
        <p className="modal-msg">
          Archive order <strong>{order.orderNumber}</strong>? Provide a reason below.
        </p>
        <div className="modal-field">
          <label className="modal-label">Reason</label>
          <input
            className="modal-input"
            type="text"
            placeholder="Archive reason…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onClose} disabled={isPending}>
            Cancel
          </button>
          <button
            className="modal-btn-confirm"
            onClick={() => mutate()}
            disabled={!reason.trim() || isPending}
          >
            {isPending ? 'Archiving…' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function OrdersPage() {
  const navigate = useNavigate()
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'

  const { page, search, status, deliveryOption, dateFrom, dateTo, archived } = useSearch({
    from: '/app/orders',
  })
  const limit = 20

  const [searchInput, setSearchInput] = useState(search ?? '')

  const [updateStatusOrder, setUpdateStatusOrder] = useState<Order | null>(null)
  const [archiveOrder_, setArchiveOrder] = useState<Order | null>(null)

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
        archived,
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
    navigate({ to: '/orders', search: () => ({ page: 1, archived: value }) })
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
          <input
            className="cust-filter-input"
            type="date"
            placeholder="From"
            value={dateFrom ?? ''}
            onChange={(e) => setFilter({ dateFrom: e.target.value || undefined })}
          />
          <input
            className="cust-filter-input"
            type="date"
            placeholder="To"
            value={dateTo ?? ''}
            onChange={(e) => setFilter({ dateTo: e.target.value || undefined })}
          />
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
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Delivery</th>
                  <th>Total incl. VAT</th>
                  <th>Created</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const isTerminal = o.status === 'completed' || o.status === 'cancelled'
                  const canArchive = isTerminal && o.archivedAt === null
                  return (
                    <tr key={o.id}>
                      <td className="users-td-muted" style={{ fontSize: '0.78rem' }}>
                        {o.orderNumber}
                      </td>
                      <td style={{ fontWeight: 500, color: '#e0e2f0' }}>
                        {o.customer?.name ?? '—'}
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
                      {isAdmin && (
                        <td>
                          <div className="users-actions">
                            <button
                              className="users-action-btn"
                              onClick={() =>
                                navigate({
                                  to: '/orders/$id',
                                  params: { id: String(o.id) },
                                })
                              }
                            >
                              View
                            </button>
                            {!archived && !isTerminal && (
                              <button
                                className="users-action-btn"
                                onClick={() => setUpdateStatusOrder(o)}
                              >
                                Update Status
                              </button>
                            )}
                            {!archived && canArchive && (
                              <button
                                className="users-action-btn"
                                onClick={() => setArchiveOrder(o)}
                              >
                                Archive
                              </button>
                            )}
                          </div>
                        </td>
                      )}
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

      {updateStatusOrder && (
        <UpdateStatusModal
          order={updateStatusOrder}
          onClose={() => setUpdateStatusOrder(null)}
          onSaved={() => setUpdateStatusOrder(null)}
        />
      )}

      {archiveOrder_ && (
        <ArchiveModal
          order={archiveOrder_}
          onClose={() => setArchiveOrder(null)}
          onSaved={() => setArchiveOrder(null)}
        />
      )}
    </>
  )
}
