import { useState, useRef } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { useDebouncedCallback } from 'use-debounce'
import type { RootState } from '../store'
import {
  getPimProducts,
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
import { ProductDrawer } from '../components/ProductDrawer'
import { ImportModal } from '../components/ImportModal'
import { resolveName, formatDate, getApiError, type Lang } from '../utils/format'

type ConfirmAction =
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
  const { page, limit, search, status, categoryId, inStock } = filters
  const currentLang = useSelector((s: RootState) => s.lang.current) as Lang

  // Keep a ref for the debounced callback to always see the latest filters
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const [searchInput, setSearchInput] = useState(search ?? '')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)

  function exitBulkMode() {
    setBulkMode(false)
    setSelected(new Set())
  }

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
      a.download = 'products-export.csv'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export ready')
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
    bulkArchiveMutation.isPending || bulkDeactivateMutation.isPending || bulkDeleteMutation.isPending

  const getName = (p: PimProduct) =>
    p.name ? resolveName(p.name, currentLang) : p.barcode ?? `#${p.id}`

  // ── Confirm modal helpers ─────────────────────────────────────────────────────

  const confirmTitle = (() => {
    if (!confirm) return ''
    switch (confirm.type) {
      case 'bulk-archive': return `Archive ${confirm.ids.length} products`
      case 'bulk-deactivate': return `Deactivate ${confirm.ids.length} products`
      case 'bulk-delete': return `Delete ${confirm.ids.length} products`
    }
  })()

  const confirmMessage = (() => {
    if (!confirm) return ''
    switch (confirm.type) {
      case 'bulk-archive': return `Archive ${confirm.ids.length} selected products?`
      case 'bulk-deactivate': return `Deactivate ${confirm.ids.length} selected products?`
      case 'bulk-delete': return `Permanently delete ${confirm.ids.length} selected products? This cannot be undone.`
    }
  })()

  const isDangerConfirm = confirm?.type === 'bulk-delete'
  const confirmLabel = confirm?.type === 'bulk-delete' ? 'Delete' : confirm?.type === 'bulk-archive' ? 'Archive' : 'Deactivate'

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

            {isAdmin && (
              <button
                className="exact-btn exact-btn-primary"
                onClick={() => setCreateOpen(true)}
              >
                + New product
              </button>
            )}
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

          <div className="products-filters-actions">
            {isAdmin && (
              <button
                className={`exact-btn exact-btn-outline${bulkMode ? ' exact-btn-outline--active' : ''}`}
                onClick={() => (bulkMode ? exitBulkMode() : setBulkMode(true))}
                title="Toggle bulk selection"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="4" height="4" rx="1" />
                  <line x1="10" y1="7" x2="21" y2="7" />
                  <rect x="3" y="13" width="4" height="4" rx="1" />
                  <line x1="10" y1="15" x2="21" y2="15" />
                </svg>
                {bulkMode && selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select'}
              </button>
            )}

            {isAdmin && (
              <button
                className="exact-btn exact-btn-outline"
                onClick={() => setImportOpen(true)}
                title="Import products from CSV"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Import
              </button>
            )}

            <button
              className="exact-btn exact-btn-outline"
              onClick={handleExport}
              disabled={isExporting}
              title="Export current view to Excel"
            >
              {isExporting ? (
                <div className="spinner-border spinner-border-sm" role="status" style={{ width: 13, height: 13, borderWidth: 2 }} />
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

        {/* Bulk actions bar */}
        {isAdmin && bulkMode && (
          <div className="products-bulk-bar">
            <span className="products-bulk-count">
              {someSelected ? `${selectedIds.length} selected` : 'Select products below'}
            </span>
            <button className="users-action-btn" disabled={mutationLoading || !someSelected} onClick={() => setConfirm({ type: 'bulk-archive', ids: selectedIds })}>Archive</button>
            <button className="users-action-btn" disabled={mutationLoading || !someSelected} onClick={() => setConfirm({ type: 'bulk-deactivate', ids: selectedIds })}>Deactivate</button>
            <button className="users-action-btn users-action-btn-danger" disabled={mutationLoading || !someSelected} onClick={() => setConfirm({ type: 'bulk-delete', ids: selectedIds })}>Delete</button>
            {someSelected && (
              <button className="users-action-btn" disabled={mutationLoading} onClick={() => setSelected(new Set())} style={{ marginLeft: 'auto' }}>Clear</button>
            )}
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
                  <th style={{ width: 48 }}>
                    {isAdmin && bulkMode ? (
                      <input
                        type="checkbox"
                        className="modal-checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                        onChange={toggleAll}
                        aria-label="Select all"
                      />
                    ) : null}
                  </th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Stock</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    style={{ cursor: bulkMode ? 'default' : 'pointer' }}
                    onClick={
                      bulkMode
                        ? () => toggleRow(p.id)
                        : () => navigate({ to: '/products/$id', params: { id: String(p.id) } })
                    }
                  >
                    <td style={{ width: 48 }} onClick={(e) => e.stopPropagation()}>
                      {isAdmin && bulkMode ? (
                        <input
                          type="checkbox"
                          className="modal-checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleRow(p.id)}
                          aria-label={`Select ${getName(p)}`}
                        />
                      ) : (
                        <div className="product-avatar">
                          {(getName(p) || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#e0e2f0' }}>
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
                    <td className="users-td-muted">
                      {p.category ? resolveName(p.category.name, currentLang) : '—'}
                    </td>
                    <td><StatusBadge status={p.status} archivedAt={p.archivedAt} /></td>
                    <td><StockCell stock={p.stock} threshold={p.lowStockThreshold} /></td>
                    <td className="users-td-muted">{formatDate(p.createdAt)}</td>
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

      {/* Import modal */}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setImportOpen(false)
            queryClient.invalidateQueries({ queryKey: ['pim-products'] })
          }}
        />
      )}

      {/* Create product drawer */}
      {createOpen && (
        <ProductDrawer onClose={() => setCreateOpen(false)} />
      )}

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
