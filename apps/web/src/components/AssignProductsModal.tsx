import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getProducts, type Product } from '../api/products'

interface Props {
  categoryId: number
  loading: boolean
  onConfirm: (productIds: string[]) => void
  onCancel: () => void
}

export function AssignProductsModal({ categoryId, loading, onConfirm, onCancel }: Props) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['products-available', categoryId, search, page],
    queryFn: () =>
      getProducts({ page, limit: 20, excludeCategoryId: categoryId, search: search || undefined }).then(
        (r) => r.data,
      ),
  })

  const products = data?.data ?? []
  const meta = data?.meta

  function toggleProduct(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (products.every((p) => selected.has(p.id))) {
      setSelected((prev) => {
        const next = new Set(prev)
        products.forEach((p) => next.delete(p.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        products.forEach((p) => next.add(p.id))
        return next
      })
    }
  }

  const allOnPageSelected = products.length > 0 && products.every((p) => selected.has(p.id))

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setPage(1)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="assign-modal" onClick={(e) => e.stopPropagation()}>
        <div className="assign-modal-header">
          <h3 className="modal-title">Assign products</h3>
          <p className="assign-modal-sub">
            {selected.size > 0 ? `${selected.size} selected` : 'Select products to assign to this category'}
          </p>
        </div>

        <div className="assign-modal-search">
          <input
            className="modal-input"
            placeholder="Search by name or SKU…"
            value={search}
            onChange={handleSearchChange}
            autoFocus
          />
        </div>

        <div className="assign-modal-body">
          {isLoading && (
            <div className="assign-modal-loading">
              <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
            </div>
          )}

          {!isLoading && products.length === 0 && (
            <div className="assign-modal-empty">
              {search ? 'No products match your search.' : 'All products are already assigned to this category.'}
            </div>
          )}

          {!isLoading && products.length > 0 && (
            <table className="users-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      className="modal-checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>Name</th>
                  <th>SKU</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p: Product) => (
                  <tr
                    key={p.id}
                    onClick={() => toggleProduct(p.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="modal-checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleProduct(p.id)}
                      />
                    </td>
                    <td style={{ color: selected.has(p.id) ? '#e0e2f0' : undefined }}>
                      {p.description ?? <span className="users-td-muted">—</span>}
                    </td>
                    <td className="users-td-muted">{p.code ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="assign-modal-pagination">
            <button className="users-pg-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ‹ Prev
            </button>
            <span className="users-pagination-info">
              {page} / {meta.totalPages}
            </span>
            <button
              className="users-pg-btn"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next ›
            </button>
          </div>
        )}

        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            className="modal-btn-confirm"
            disabled={loading || selected.size === 0}
            onClick={() => onConfirm(Array.from(selected))}
          >
            {loading ? 'Assigning…' : `Assign ${selected.size > 0 ? selected.size : ''} product${selected.size === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
