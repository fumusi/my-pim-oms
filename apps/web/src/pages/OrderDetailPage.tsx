import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import type { RootState } from '../store'
import {
  getOrder,
  updateOrderStatus,
  downloadInvoice,
  NEXT_STATUSES,
  type OrderStatus,
} from '../api/orders'
import { formatDate, getApiError } from '../utils/format'
import { ArchiveOrderModal } from '../components/ArchiveOrderModal'

export function OrderDetailPage() {
  const { id } = useParams({ from: '/app/orders/$id' })
  const orderId = parseInt(id, 10)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'

  const [archiveOpen, setArchiveOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('')

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId).then((r) => r.data),
  })

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['recent-orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders-count'] })
      setSelectedStatus('')
      toast.success('Status updated')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  if (isLoading) {
    return (
      <div className="profile-loading">
        <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="profile-loading">
        <p style={{ color: '#f87171' }}>Failed to load order.</p>
      </div>
    )
  }

  const nextStatuses = NEXT_STATUSES[order.status]
  const isTerminal = order.status === 'completed' || order.status === 'cancelled'
  const canArchive = isTerminal && order.archivedAt === null

  const activeSelectedStatus: OrderStatus =
    selectedStatus !== '' ? selectedStatus : nextStatuses[0]

  const subtotal = order.lineItems.reduce((sum, li) => sum + li.lineTotalExclVat, 0)

  return (
    <div className="cust-detail-page">
      <div>
        <button className="cust-back-btn" onClick={() => navigate({ to: '/orders' })}>
          ← Orders
        </button>
      </div>

      <div className="dash-card cust-detail-header">
        <div className="cust-detail-header-left">
          <div className="order-detail-header-meta">
            <div className="order-detail-order-num">{order.orderNumber}</div>
            <span className={`order-status-badge order-status-${order.status}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
            <div className="order-detail-created">{formatDate(order.createdAt)}</div>
          </div>
        </div>

        <div className="order-detail-header-right">
          {isAdmin && (
            <>
              {!isTerminal && (
                <button
                  className="exact-btn exact-btn-outline"
                  onClick={() =>
                    navigate({ to: '/orders/$id/edit', params: { id: String(orderId) } })
                  }
                >
                  Edit
                </button>
              )}
              {nextStatuses.length > 0 && (
                <>
                  <select
                    className="cust-filter-select"
                    value={activeSelectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
                  >
                    {nextStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                  <button
                    className="exact-btn exact-btn-primary"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate(activeSelectedStatus)}
                  >
                    {statusMutation.isPending ? 'Saving…' : 'Update'}
                  </button>
                </>
              )}
            </>
          )}
          <button
            className="exact-btn exact-btn-outline"
            onClick={() =>
              downloadInvoice(orderId, order.orderNumber).catch((e) =>
                toast.error(getApiError(e)),
              )
            }
          >
            Export PDF
          </button>
          {isAdmin && canArchive && (
            <button
              className="exact-btn exact-btn-danger-outline"
              onClick={() => setArchiveOpen(true)}
            >
              Archive
            </button>
          )}
        </div>
      </div>

      <div className="cust-detail-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="dash-card">
            <div className="cust-section-header">
              <div className="dash-card-title">Customer</div>
            </div>
            <div className="cust-detail-field">
              <span className="modal-label">User</span>
              <span className="cust-detail-value">{order.createdByName ?? order.createdBy ?? '—'}</span>
            </div>
            {order.customer && (
              <>
                <div className="cust-detail-field">
                  <span className="modal-label">Customer</span>
                  <span className="cust-detail-value">{order.customer.name}</span>
                </div>
                <div className="cust-detail-field">
                  <span className="modal-label">Email</span>
                  <span className="cust-detail-value">{order.customer.email ?? '—'}</span>
                </div>
              </>
            )}
            {order.shippingAddress && (
              <div className="cust-detail-field">
                <span className="modal-label">Shipping address</span>
                <span className="cust-detail-value">
                  {order.shippingAddress.street} {order.shippingAddress.houseNumber},{' '}
                  {order.shippingAddress.postalCode} {order.shippingAddress.city},{' '}
                  {order.shippingAddress.country}
                </span>
              </div>
            )}
          </div>

          <div className="dash-card">
            <div className="cust-section-header">
              <div className="dash-card-title">Order details</div>
            </div>
            {order.description && (
              <div className="cust-detail-field">
                <span className="modal-label">Description</span>
                <span className="cust-detail-value">{order.description}</span>
              </div>
            )}
            <div className="cust-detail-field">
              <span className="modal-label">Order source</span>
              <span className="cust-detail-value">{order.orderSource}</span>
            </div>
            <div className="cust-detail-field">
              <span className="modal-label">Delivery option</span>
              <span className="cust-detail-value">
                {order.deliveryOption.charAt(0).toUpperCase() + order.deliveryOption.slice(1)}
              </span>
            </div>
            {order.trackingUrl && (
              <div className="cust-detail-field">
                <span className="modal-label">Tracking URL</span>
                <span className="cust-detail-value">{order.trackingUrl}</span>
              </div>
            )}
            <div className="cust-detail-field">
              <span className="modal-label">Created at</span>
              <span className="cust-detail-value">{formatDate(order.createdAt)}</span>
            </div>
            {order.createdBy && (
              <div className="cust-detail-field">
                <span className="modal-label">Created by</span>
                <span className="cust-detail-value">{order.createdBy}</span>
              </div>
            )}
            <div className="cust-detail-field">
              <span className="modal-label">Updated at</span>
              <span className="cust-detail-value">{formatDate(order.updatedAt)}</span>
            </div>
            {order.updatedBy && (
              <div className="cust-detail-field">
                <span className="modal-label">Updated by</span>
                <span className="cust-detail-value">{order.updatedBy}</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="dash-card">
            <div className="cust-section-header">
              <div className="dash-card-title">Totals</div>
            </div>
            <div className="order-totals-row">
              <span className="order-totals-label">Total excl. VAT</span>
              <span className="order-totals-value">
                {order.totalExclVat != null ? `€${order.totalExclVat.toFixed(2)}` : '—'}
              </span>
            </div>
            <div className="order-totals-row">
              <span className="order-totals-label">
                VAT ({order.vatPercentage ?? 0}%)
              </span>
              <span className="order-totals-value">
                {order.vatAmount != null ? `€${order.vatAmount.toFixed(2)}` : '—'}
              </span>
            </div>
            <div className="order-totals-row">
              <span className="order-totals-label">Shipping</span>
              <span className="order-totals-value">
                €{order.shippingCost.toFixed(2)}
                {order.freeShippingApplied && (
                  <span className="order-free-shipping-badge">FREE</span>
                )}
              </span>
            </div>
            <div className="order-totals-total-row">
              <span>Total incl. VAT</span>
              <span>
                {order.totalInclVat != null ? `€${order.totalInclVat.toFixed(2)}` : '—'}
              </span>
            </div>
          </div>

          {order.archivedAt && (
            <div className="dash-card">
              <div className="cust-section-header">
                <div className="dash-card-title">Archive info</div>
              </div>
              <div className="order-archive-info">
                <div className="order-archive-info-row">
                  <span className="order-archive-info-label">Archived at</span>
                  <span className="order-archive-info-value">{formatDate(order.archivedAt)}</span>
                </div>
                {order.archiveReason && (
                  <div className="order-archive-info-row">
                    <span className="order-archive-info-label">Reason</span>
                    <span className="order-archive-info-value">{order.archiveReason}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="dash-card">
        <div className="cust-section-header">
          <div className="dash-card-title">Line items</div>
        </div>
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Discount</th>
                <th>Line total</th>
                <th>Fulfillable</th>
              </tr>
            </thead>
            <tbody>
              {order.lineItems.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ color: '#6b6e87', fontSize: '0.8rem', padding: '0.75rem 0' }}>
                    No line items.
                  </td>
                </tr>
              )}
              {order.lineItems.map((li) => (
                <tr key={li.id}>
                  <td style={{ color: '#e0e2f0' }}>{li.productName}</td>
                  <td className="users-td-muted">{li.sku ?? '—'}</td>
                  <td className="users-td-muted">{li.quantity}</td>
                  <td className="users-td-muted">€{li.unitPrice.toFixed(2)}</td>
                  <td className="users-td-muted">{li.discount}%</td>
                  <td className="users-td-muted">€{li.lineTotalExclVat.toFixed(2)}</td>
                  <td>
                    {li.isFulfillable ? (
                      <span className="order-li-fulfillable-yes">✓</span>
                    ) : (
                      <span className="order-li-fulfillable-no">✗</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {order.lineItems.length > 0 && (
              <tfoot>
                <tr className="order-li-footer-row">
                  <td colSpan={5} />
                  <td style={{ textAlign: 'right' }}>Subtotal: €{subtotal.toFixed(2)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {archiveOpen && (
        <ArchiveOrderModal
          order={order}
          onClose={() => setArchiveOpen(false)}
          onSaved={() => { setArchiveOpen(false); navigate({ to: '/orders' }) }}
        />
      )}
    </div>
  )
}
