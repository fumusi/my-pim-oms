import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import type { RootState } from '../store'
import {
  getPriceList,
  getPriceListCustomers,
  updatePriceListStatus,
  archivePriceList,
  removePriceListItem,
  updatePriceListItem,
  unassignCustomerFromPriceList,
  type PriceListItem,
} from '../api/price-lists'
import { PriceListDrawer } from '../components/PriceListDrawer'
import { AddProductModal } from '../components/AddProductModal'
import { BulkAddModal } from '../components/BulkAddModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { formatDate, getApiError } from '../utils/format'

function StatusBadge({ status, archivedAt }: { status: string; archivedAt: string | null }) {
  if (archivedAt) return <span className="cust-status-badge cust-status-archived">Archived</span>
  if (status === 'active') return <span className="cust-status-badge cust-status-active">Active</span>
  return <span className="cust-status-badge cust-status-inactive">Inactive</span>
}

function ActiveNowBadge({ startDate, endDate }: { startDate: string | null; endDate: string | null }) {
  const today = new Date().toISOString().slice(0, 10)
  const afterStart = !startDate || today >= startDate
  const beforeEnd = !endDate || today <= endDate
  if (!afterStart || !beforeEnd) return null
  return <span className="cust-status-badge cust-status-active" style={{ fontSize: '0.7rem' }}>Active now</span>
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
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

function calcEffectivePrice(customPrice: number, discount: number | null): number {
  if (discount == null) return customPrice
  return parseFloat((customPrice * (1 - discount / 100)).toFixed(4))
}

function resolveProductName(item: PriceListItem): string {
  return item.product?.name?.en ?? item.product?.name?.nl ?? `Product #${item.productId}`
}

export function PriceListDetailPage() {
  const { id } = useParams({ from: '/app/price-lists/$id' })
  const priceListId = parseInt(id, 10)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'

  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editDiscount, setEditDiscount] = useState('')

  const { data: pl, isLoading, isError } = useQuery({
    queryKey: ['price-list', priceListId],
    queryFn: () => getPriceList(priceListId),
    enabled: !isNaN(priceListId),
  })

  const { data: assignedCustomers } = useQuery({
    queryKey: ['price-list-customers', priceListId],
    queryFn: () => getPriceListCustomers(priceListId),
    enabled: !isNaN(priceListId) && isAdmin,
  })

  const statusMutation = useMutation({
    mutationFn: (status: 'active' | 'inactive') => updatePriceListStatus(priceListId, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['price-list', priceListId] }); toast.success('Status updated') },
    onError: (err) => toast.error(getApiError(err)),
  })

  const archiveMutation = useMutation({
    mutationFn: () => archivePriceList(priceListId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['price-list', priceListId] }); toast.success('Archived') },
    onError: (err) => toast.error(getApiError(err)),
  })

  const removeItemMutation = useMutation({
    mutationFn: (itemId: number) => removePriceListItem(priceListId, itemId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['price-list', priceListId] }); toast.success('Product removed') },
    onError: (err) => toast.error(getApiError(err)),
  })

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, body }: { itemId: number; body: { customPrice?: number; discount?: number | null } }) =>
      updatePriceListItem(priceListId, itemId, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['price-list', priceListId] }); toast.success('Price updated'); setEditingItemId(null) },
    onError: (err) => toast.error(getApiError(err)),
  })

  const unassignMutation = useMutation({
    mutationFn: (customerId: number) => unassignCustomerFromPriceList(priceListId, customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-list', priceListId] })
      queryClient.invalidateQueries({ queryKey: ['price-list-customers', priceListId] })
      toast.success('Customer unassigned')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  if (isNaN(priceListId)) return <div className="profile-loading"><p style={{ color: '#f87171' }}>Invalid price list.</p></div>
  if (isLoading) return <div className="profile-loading"><div className="spinner-border" style={{ color: '#7c3aed' }} /></div>
  if (isError || !pl) return <div className="profile-loading"><p style={{ color: '#f87171' }}>Failed to load price list.</p></div>

  return (
    <div className="cust-detail-page">
      <div>
        <button className="cust-back-btn" onClick={() => navigate({ to: '/price-lists' })}>
          ← Price Lists
        </button>
      </div>

      <div className="dash-card cust-detail-header">
        <div className="cust-detail-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="cust-detail-name">{pl.name}</h1>
            <StatusBadge status={pl.status} archivedAt={pl.archivedAt} />
            <ActiveNowBadge startDate={pl.startDate} endDate={pl.endDate} />
          </div>
          {pl.description && <div className="users-td-muted" style={{ marginTop: 4 }}>{pl.description}</div>}
        </div>
        {isAdmin && (
          <div className="cust-detail-header-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="exact-btn exact-btn-outline" onClick={() => setEditDrawerOpen(true)}>Edit</button>
            {!pl.archivedAt && (
              <button
                className="exact-btn"
                onClick={() => statusMutation.mutate(pl.status === 'active' ? 'inactive' : 'active')}
                disabled={statusMutation.isPending}
              >
                {pl.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
            )}
            {!pl.archivedAt && (
              <button className="exact-btn" onClick={() => setArchiveConfirmOpen(true)}>Archive</button>
            )}
          </div>
        )}
      </div>

      <div className="cust-detail-grid">
        <SectionCard title="General information">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 0' }}>
            {pl.startDate && <div className="cust-detail-field"><span className="modal-label">Start date</span><span className="cust-detail-value">{pl.startDate}</span></div>}
            {pl.endDate && <div className="cust-detail-field"><span className="modal-label">End date</span><span className="cust-detail-value">{pl.endDate}</span></div>}
            <div className="cust-detail-field"><span className="modal-label">Created</span><span className="cust-detail-value">{formatDate(pl.createdAt)}{pl.createdBy ? ` by ${pl.createdBy}` : ''}</span></div>
            <div className="cust-detail-field"><span className="modal-label">Updated</span><span className="cust-detail-value">{formatDate(pl.updatedAt)}{pl.updatedBy ? ` by ${pl.updatedBy}` : ''}</span></div>
          </div>
        </SectionCard>
        <SectionCard title="Overview">
          <div style={{ padding: '12px 0' }}>
            <div className="cust-detail-field"><span className="modal-label">Products</span><span className="cust-detail-value">{pl.items.length}</span></div>
            <div className="cust-detail-field"><span className="modal-label">Assigned customers</span><span className="cust-detail-value">{pl.customerCount}</span></div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Products"
        action={isAdmin ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="exact-btn" onClick={() => setBulkAddOpen(true)}>Bulk Add</button>
            <button className="exact-btn exact-btn-primary" onClick={() => setAddProductOpen(true)}>+ Add Product</button>
          </div>
        ) : undefined}
      >
        {pl.items.length === 0 ? (
          <div className="profile-loading"><p style={{ color: '#6b6e87' }}>No products in this price list</p></div>
        ) : (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Base price</th>
                  <th>Custom price</th>
                  <th>Discount</th>
                  <th>Effective price</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {pl.items.map((item) =>
                  editingItemId === item.id ? (
                    <tr key={item.id}>
                      <td colSpan={4}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="number"
                            className="modal-input"
                            style={{ width: 110 }}
                            placeholder="Custom price"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            min="0.01"
                            step="0.01"
                          />
                          <input
                            type="number"
                            className="modal-input"
                            style={{ width: 90 }}
                            placeholder="Discount %"
                            value={editDiscount}
                            onChange={(e) => setEditDiscount(e.target.value)}
                            min="0"
                            max="100"
                            step="0.01"
                          />
                        </div>
                      </td>
                      <td colSpan={2} />
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="exact-btn exact-btn-primary"
                            style={{ fontSize: '0.75rem', padding: '2px 10px' }}
                            disabled={updateItemMutation.isPending}
                            onClick={() => {
                              const price = parseFloat(editPrice)
                              const disc = editDiscount !== '' ? parseFloat(editDiscount) : null
                              if (isNaN(price) || price <= 0) return
                              updateItemMutation.mutate({ itemId: item.id, body: { customPrice: price, discount: disc } })
                            }}
                          >Save</button>
                          <button
                            className="exact-btn"
                            style={{ fontSize: '0.75rem', padding: '2px 10px' }}
                            onClick={() => setEditingItemId(null)}
                          >Cancel</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500, color: '#e0e2f0' }}>{resolveProductName(item)}</td>
                      <td className="users-td-muted">{item.product?.barcode ?? '—'}</td>
                      <td className="users-td-muted">{item.product?.basePrice != null ? `€${item.product.basePrice.toFixed(2)}` : '—'}</td>
                      <td className="users-td-muted">€{item.customPrice.toFixed(2)}</td>
                      <td className="users-td-muted">{item.discount != null ? `${item.discount}%` : '—'}</td>
                      <td style={{ color: '#7c3aed', fontWeight: 500 }}>€{calcEffectivePrice(item.customPrice, item.discount).toFixed(2)}</td>
                      {isAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="exact-btn"
                              style={{ fontSize: '0.75rem', padding: '2px 10px' }}
                              onClick={() => {
                                setEditingItemId(item.id)
                                setEditPrice(String(item.customPrice))
                                setEditDiscount(item.discount != null ? String(item.discount) : '')
                              }}
                            >Edit</button>
                            <button
                              className="exact-btn"
                              style={{ fontSize: '0.75rem', padding: '2px 10px', color: '#f87171' }}
                              disabled={removeItemMutation.isPending}
                              onClick={() => removeItemMutation.mutate(item.id)}
                            >Remove</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {isAdmin && (
        <SectionCard title="Assigned Customers">
          {!assignedCustomers || assignedCustomers.length === 0 ? (
            <div className="profile-loading"><p style={{ color: '#6b6e87' }}>No customers assigned</p></div>
          ) : (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Assigned</th>
                    <th>By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedCustomers.map((c) => (
                    <tr key={c.customerId}>
                      <td style={{ fontWeight: 500, color: '#e0e2f0' }}>{c.customerName}</td>
                      <td className="users-td-muted">{c.customerEmail}</td>
                      <td className="users-td-muted">{formatDate(c.assignedAt)}</td>
                      <td className="users-td-muted">{c.assignedBy ?? '—'}</td>
                      <td>
                        <button
                          className="exact-btn"
                          style={{ fontSize: '0.75rem', padding: '2px 10px', color: '#f87171' }}
                          disabled={unassignMutation.isPending}
                          onClick={() => unassignMutation.mutate(c.customerId)}
                        >Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {archiveConfirmOpen && (
        <ConfirmModal
          title="Archive price list"
          message={`Archive "${pl.name}"? This cannot be undone if customers are assigned.`}
          confirmLabel="Archive"
          danger
          loading={archiveMutation.isPending}
          onConfirm={() => { archiveMutation.mutate(); setArchiveConfirmOpen(false) }}
          onCancel={() => setArchiveConfirmOpen(false)}
        />
      )}

      {editDrawerOpen && (
        <PriceListDrawer
          priceList={pl}
          onClose={() => setEditDrawerOpen(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['price-list', priceListId] })
            queryClient.invalidateQueries({ queryKey: ['price-lists'] })
            setEditDrawerOpen(false)
          }}
        />
      )}

      {addProductOpen && (
        <AddProductModal
          priceListId={priceListId}
          existingProductIds={new Set(pl.items.map((i) => i.productId))}
          onClose={() => setAddProductOpen(false)}
          onAdded={() => {
            queryClient.invalidateQueries({ queryKey: ['price-list', priceListId] })
            setAddProductOpen(false)
          }}
        />
      )}

      {bulkAddOpen && (
        <BulkAddModal
          priceListId={priceListId}
          onClose={() => setBulkAddOpen(false)}
          onDone={() => {
            queryClient.invalidateQueries({ queryKey: ['price-list', priceListId] })
            setBulkAddOpen(false)
          }}
        />
      )}
    </div>
  )
}
