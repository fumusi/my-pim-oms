import { useState, useRef } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { useDebouncedCallback } from 'use-debounce'
import type { RootState } from '../store'
import {
  getPimProducts,
  archivePimProduct,
  updatePimProductStatus,
  deletePimProduct,
  bulkArchivePimProducts,
  bulkUpdatePimProductStatus,
  bulkDeletePimProducts,
  exportPimProducts,
  type PimProduct,
  type ProductStatus,
  type StockFilter,
} from '../api/pim-products'
import { getCategories } from '../api/categories'
import { ConfirmModal } from '../components/ConfirmModal'
import { resolveName, formatDate, getApiError, type Lang } from '../utils/format'

type ConfirmAction =
  | { type: 'archive'; product: PimProduct }
  | { type: 'deactivate'; product: PimProduct }
  | { type: 'delete'; product: PimProduct }
  | { type: 'bulk-archive'; ids: number[] }
  | { type: 'bulk-deactivate'; ids: number[] }
  | { type: 'bulk-delete'; ids: number[] }

type ProductsSearch = {
  page: number
  limit: number
  search: string | undefined
  status: ProductStatus | undefined
  categoryId: number | undefined
  inStock: StockFilter | undefined
  lang: 'nl' | 'en' | 'de'
}

function StatusBadge({ status, archivedAt }: { status: ProductStatus; archivedAt: string | null }) {
  if (archivedAt) return <span className="cat-status-pill cat-status-archived">Archived</span>
  if (status === 'active') return <span className="users-status-pill users-status-active">Active</span>
  return <span className="cat-status-pill cat-status-inactive">Inactive</span>
}

function StockCell({ stock, threshold }: { stock: number | null; threshold: number | null }) {
  if (stock === null) return <span className="users-td-muted">—</span>
  if (stock <= 0) return <span className="products-stock-pill products-stock-zero">Out of stock</span>
  if (threshold !== null && stock < threshold) {
    return (
      <span className="products-stock-pill products-stock-low">
        {stock}
        <span style={{ opacity: 0.65, marginLeft: 3 }}>/ {threshold}</span>
      </span>
    )
  }
  return <span>{stock}</span>
}

const STATUS_OPTIONS: { value: ProductStatus | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
]

export function ProductsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'

  // '/app/products' is the route ID (parent has id: 'app', child path: '/products')
  const filters = useSearch({ from: '/app/products' })
  const { page, limit, search, status, categoryId, inStock, lang } = filters

  // Keep a ref for the debounced callback to always see the latest filters
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const [searchInput, setSearchInput] = useState(search ?? '')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const debouncedSearch = useDebouncedCallback((value: string) => {
    const f = filtersRef.current
    navigate({
      to: '/products',
      search: { ...f, search: value || undefined, page: 1 } as ProductsSearch,
    })
  }, 350)

  function setFilter(updates: Partial<ProductsSearch>) {
    setSelected(new Set())
    navigate({
      to: '/products',
      search: { ...filters, ...updates, page: 1 } as ProductsSearch,
    })
  }

  function setPage(p: number) {
    navigate({ to: '/products', search: { ...filters, page: p } as ProductsSearch })
  }

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pim-products', { page, limit, search, status, categoryId, inStock }],
    queryFn: () =>
      getPimProducts({ page, limit, search: search || undefined, status, categoryId, inStock }).then(
        (r) => r.data,
      ),
    placeholderData: keepPreviousData,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories().then((r) => r.data),
  })

  // ── Single mutations ──────────────────────────────────────────────────────────

  const archiveMutation = useMutation({
    mutationFn: (id: number) => archivePimProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pim-products'] })
      setConfirm(null)
      setSelected(new Set())
      toast.success('Product archived')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, s }: { id: number; s: ProductStatus }) => updatePimProductStatus(id, s),
    onSuccess: (_, { s }) => {
      queryClient.invalidateQueries({ queryKey: ['pim-products'] })
      setConfirm(null)
      toast.success(s === 'inactive' ? 'Product deactivated' : 'Product activated')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePimProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pim-products'] })
      setConfirm(null)
      setSelected(new Set())
      toast.success('Product deleted')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  // ── Bulk mutations ────────────────────────────────────────────────────────────

  const bulkArchiveMutation = useMutation({
    mutationFn: (ids: number[]) => bulkArchivePimProducts(ids),
    onSuccess: (res, ids) => {
      queryClient.invalidateQueries({ queryKey: ['pim-products'] })
      setConfirm(null)
      setSelected(new Set())
      const skipped = res.data.skipped.length
      const count = ids.length - skipped
      if (skipped > 0) {
        const reasons = [...new Set(res.data.skipped.map((s) => s.reason))].join(', ')
        toast.warning(`${count} archived, ${skipped} skipped (${reasons})`)
      } else {
        toast.success(`${count} product${count === 1 ? '' : 's'} archived`)
      }
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const bulkDeactivateMutation = useMutation({
    mutationFn: (ids: number[]) => bulkUpdatePimProductStatus(ids, 'inactive'),
    onSuccess: (res, ids) => {
      queryClient.invalidateQueries({ queryKey: ['pim-products'] })
      setConfirm(null)
      setSelected(new Set())
      const skipped = res.data.skipped.length
      const count = ids.length - skipped
      if (skipped > 0) {
        const reasons = [...new Set(res.data.skipped.map((s) => s.reason))].join(', ')
        toast.warning(`${count} deactivated, ${skipped} skipped (${reasons})`)
      } else {
        toast.success(`${count} product${count === 1 ? '' : 's'} deactivated`)
      }
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => bulkDeletePimProducts(ids),
    onSuccess: (res, ids) => {
      queryClient.invalidateQueries({ queryKey: ['pim-products'] })
      setConfirm(null)
      setSelected(new Set())
      const skipped = res.data.skipped.length
      const count = ids.length - skipped
      if (skipped > 0) {
        const reasons = [...new Set(res.data.skipped.map((s) => s.reason))].join(', ')
        toast.warning(`${count} deleted, ${skipped} skipped (${reasons})`)
      } else {
        toast.success(`${count} product${count === 1 ? '' : 's'} deleted`)
      }
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  // ── Export ────────────────────────────────────────────────────────────────────

  async function handleExport() {
    setIsExporting(true)
    try {
      const res = await exportPimProducts({ search: search || undefined, status, categoryId, inStock })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'products-export.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setIsExporting(false)
    }
  }

  // ── Confirm handler ───────────────────────────────────────────────────────────

  function handleConfirm() {
    if (!confirm) return
    switch (confirm.type) {
      case 'archive': archiveMutation.mutate(confirm.product.id); break
      case 'deactivate': statusMutation.mutate({ id: confirm.product.id, s: 'inactive' }); break
      case 'delete': deleteMutation.mutate(confirm.product.id); break
      case 'bulk-archive': bulkArchiveMutation.mutate(confirm.ids); break
      case 'bulk-deactivate': bulkDeactivateMutation.mutate(confirm.ids); break
      case 'bulk-delete': bulkDeleteMutation.mutate(confirm.ids); break
    }
  }

  // ── Selection ─────────────────────────────────────────────────────────────────

  const products = data?.data ?? []
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0
  const allSelected = products.length > 0 && products.every((p) => selected.has(p.id))
  const someSelected = products.some((p) => selected.has(p.id))
  const selectedIds = [...selected]

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(products.map((p) => p.id)))
    }
  }

  function toggleRow(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const mutationLoading =
    archiveMutation.isPending || statusMutation.isPending || deleteMutation.isPending ||
    bulkArchiveMutation.isPending || bulkDeactivateMutation.isPending || bulkDeleteMutation.isPending

  const currentLang = (lang ?? 'nl') as Lang
  const getName = (p: PimProduct) =>
    p.name ? resolveName(p.name, currentLang) : p.barcode ?? `#${p.id}`

  // ── Confirm modal helpers ─────────────────────────────────────────────────────

  const confirmTitle = (() => {
    if (!confirm) return ''
    switch (confirm.type) {
      case 'archive': return 'Archive product'
      case 'deactivate': return 'Deactivate product'
      case 'delete': return 'Delete product'
      case 'bulk-archive': return `Archive ${confirm.ids.length} products`
      case 'bulk-deactivate': return `Deactivate ${confirm.ids.length} products`
      case 'bulk-delete': return `Delete ${confirm.ids.length} products`
    }
  })()

  const confirmMessage = (() => {
    if (!confirm) return ''
    switch (confirm.type) {
      case 'archive': return `Archive "${getName(confirm.product)}"?`
      case 'deactivate': return `Deactivate "${getName(confirm.product)}"?`
      case 'delete': return `Permanently delete "${getName(confirm.product)}"? This cannot be undone.`
      case 'bulk-archive': return `Archive ${confirm.ids.length} selected products?`
      case 'bulk-deactivate': return `Deactivate ${confirm.ids.length} selected products?`
      case 'bulk-delete': return `Permanently delete ${confirm.ids.length} selected products? This cannot be undone.`
    }
  })()

  const isDangerConfirm = confirm?.type === 'delete' || confirm?.type === 'bulk-delete'
  const confirmLabel =
    confirm?.type === 'delete' || confirm?.type === 'bulk-delete' ? 'Delete' :
    confirm?.type === 'archive' || confirm?.type === 'bulk-archive' ? 'Archive' : 'Deactivate'

  const hasFilters = !!(search || status || categoryId || inStock)

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="dash-card">

        {/* Header */}
        <div className="dash-card-header">
          <div>
            <div className="dash-card-title">Product Catalogue</div>
            <div className="dash-card-sub">
              {data
                ? `${data.total} product${data.total === 1 ? '' : 's'}${hasFilters ? ' matching filters' : ''}`
                : 'Loading…'}
            </div>
          </div>

          <div className="cat-header-controls">
            <div className="lang-switcher">
              {(['nl', 'en', 'de'] as const).map((l) => (
                <button
                  key={l}
                  className={`lang-switcher-btn${currentLang === l ? ' lang-switcher-btn--active' : ''}`}
                  onClick={() => setFilter({ lang: l })}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              className="exact-btn exact-btn-outline"
              onClick={handleExport}
              disabled={isExporting}
              title="Export current view to Excel"
            >
              {isExporting ? (
                <div
                  className="spinner-border spinner-border-sm"
                  role="status"
                  style={{ width: 13, height: 13, borderWidth: 2 }}
                />
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="products-filters">
          <input
            className="products-search"
            type="text"
            placeholder="Search products…"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              debouncedSearch(e.target.value)
            }}
          />

          <div className="status-filter">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <button
                key={value ?? 'all'}
                className={`status-filter-btn${status === value ? ' status-filter-btn--active' : ''}`}
                onClick={() => setFilter({ status: value })}
              >
                {label}
              </button>
            ))}
          </div>

          <select
            className="products-filter-select"
            value={categoryId ?? ''}
            onChange={(e) => setFilter({ categoryId: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {resolveName(cat.name, currentLang)}
              </option>
            ))}
          </select>

          <select
            className="products-filter-select"
            value={inStock ?? ''}
            onChange={(e) => setFilter({ inStock: (e.target.value || undefined) as StockFilter | undefined })}
          >
            <option value="">All stock levels</option>
            <option value="in_stock">In stock</option>
            <option value="low_stock">Low stock</option>
            <option value="out_of_stock">Out of stock</option>
          </select>

          <select
            className="products-filter-select"
            value={limit}
            onChange={(e) =>
              navigate({
                to: '/products',
                search: { ...filters, limit: Number(e.target.value), page: 1 } as ProductsSearch,
              })
            }
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>

        {/* Bulk actions bar (admin only, shown when rows selected) */}
        {isAdmin && someSelected && (
          <div className="products-bulk-bar">
            <span className="products-bulk-count">{selectedIds.length} selected</span>
            <button
              className="users-action-btn"
              disabled={mutationLoading}
              onClick={() => setConfirm({ type: 'bulk-archive', ids: selectedIds })}
            >
              Archive
            </button>
            <button
              className="users-action-btn"
              disabled={mutationLoading}
              onClick={() => setConfirm({ type: 'bulk-deactivate', ids: selectedIds })}
            >
              Deactivate
            </button>
            <button
              className="users-action-btn users-action-btn-danger"
              disabled={mutationLoading}
              onClick={() => setConfirm({ type: 'bulk-delete', ids: selectedIds })}
            >
              Delete
            </button>
            <button
              className="users-action-btn"
              disabled={mutationLoading}
              onClick={() => setSelected(new Set())}
              style={{ marginLeft: 'auto' }}
            >
              Clear
            </button>
          </div>
        )}

        {/* Loading */}
        {isLoading && !data && (
          <div className="profile-loading">
            <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="profile-loading">
            <p style={{ color: '#f87171' }}>Failed to load products.</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && products.length === 0 && (
          <div className="shell-empty-state">
            <svg
              className="shell-empty-icon"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <p className="shell-empty-title">No products found</p>
            <p className="shell-empty-hint">
              {hasFilters ? 'Try adjusting your filters.' : 'Sync products from Exact Online to see them here.'}
            </p>
          </div>
        )}

        {/* Table */}
        {!isError && products.length > 0 && (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  {isAdmin && (
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        className="modal-checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected && !allSelected
                        }}
                        onChange={toggleAll}
                        aria-label="Select all"
                      />
                    </th>
                  )}
                  <th>Name</th>
                  <th>Barcode</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Stock</th>
                  <th>Created</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    {isAdmin && (
                      <td>
                        <input
                          type="checkbox"
                          className="modal-checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleRow(p.id)}
                          aria-label={`Select ${getName(p)}`}
                        />
                      </td>
                    )}
                    <td>
                      <div
                        style={{ fontWeight: 500, color: '#a78bfa', cursor: 'pointer' }}
                        onClick={() => navigate({ to: '/products/$id', params: { id: String(p.id) } })}
                      >
                        {p.name
                          ? resolveName(p.name, currentLang)
                          : <span className="users-td-muted">—</span>}
                      </div>
                      {p.exactId && (
                        <div style={{ fontSize: '0.72rem', color: '#4e5068', marginTop: 2 }}>
                          {p.exactId.slice(0, 8)}…
                        </div>
                      )}
                    </td>
                    <td className="users-td-muted">{p.barcode ?? '—'}</td>
                    <td className="users-td-muted">
                      {p.category ? resolveName(p.category.name, currentLang) : '—'}
                    </td>
                    <td>
                      <StatusBadge status={p.status} archivedAt={p.archivedAt} />
                    </td>
                    <td>
                      <StockCell stock={p.stock} threshold={p.lowStockThreshold} />
                    </td>
                    <td className="users-td-muted">{formatDate(p.createdAt)}</td>
                    {isAdmin && (
                      <td>
                        <div className="users-actions">
                          {!p.archivedAt && p.status === 'active' && (
                            <button
                              className="users-action-btn"
                              onClick={() => setConfirm({ type: 'deactivate', product: p })}
                            >
                              Deactivate
                            </button>
                          )}
                          {!p.archivedAt && p.status === 'inactive' && (
                            <button
                              className="users-action-btn"
                              disabled={statusMutation.isPending}
                              onClick={() => statusMutation.mutate({ id: p.id, s: 'active' })}
                            >
                              Activate
                            </button>
                          )}
                          {!p.archivedAt && (
                            <button
                              className="users-action-btn"
                              onClick={() => setConfirm({ type: 'archive', product: p })}
                            >
                              Archive
                            </button>
                          )}
                          <button
                            className="users-action-btn users-action-btn-danger"
                            onClick={() => setConfirm({ type: 'delete', product: p })}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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

      {/* Confirm modal */}
      {confirm && (
        <ConfirmModal
          title={confirmTitle}
          message={confirmMessage}
          confirmLabel={confirmLabel}
          danger={isDangerConfirm}
          loading={mutationLoading}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}
