import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getProducts } from '../api/products'

const PAGE_SIZE = 20

function StatusBadge({ isSalesItem }: { isSalesItem: boolean | null }) {
  if (isSalesItem === null) {
    return <span className="users-status-pill" style={{ color: '#6b6e83', background: 'rgba(107,110,131,0.12)' }}>—</span>
  }
  if (isSalesItem) {
    return <span className="users-status-pill users-status-active">Active</span>
  }
  return <span className="users-status-pill users-status-inactive">Inactive</span>
}

export function ProductsPage() {
  const [page, setPage] = useState(1)

  const { data: products, isLoading, isError } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts().then((r) => r.data),
  })

  if (isLoading) {
    return (
      <div className="profile-loading">
        <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="profile-loading">
        <p style={{ color: '#f87171' }}>Failed to load products.</p>
      </div>
    )
  }

  if (!products || products.length === 0) {
    return (
      <div className="shell-empty-state">
        <svg className="shell-empty-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
        <p className="shell-empty-title">No products yet</p>
        <p className="shell-empty-hint">Sync products from Exact Online to see them here.</p>
      </div>
    )
  }

  const totalPages = Math.ceil(products.length / PAGE_SIZE)
  const paginated = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <div>
          <div className="dash-card-title">Product Catalogue</div>
          <div className="dash-card-sub">{products.length} product{products.length === 1 ? '' : 's'} synced from Exact Online</div>
        </div>
      </div>

      <div className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((p, i) => (
              <tr key={p.id}>
                <td className="users-td-muted">{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td>{p.description ?? <span className="users-td-muted">—</span>}</td>
                <td className="users-td-muted">{p.code ?? '—'}</td>
                <td className="users-td-muted">
                  {p.itemGroup?.description ?? p.itemGroupDescription ?? '—'}
                </td>
                <td>
                  <StatusBadge isSalesItem={p.isSalesItem} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="users-pagination">
          <span className="users-pagination-info">
            Page {page} of {totalPages}
          </span>
          <div className="users-pagination-btns">
            <button
              className="users-pg-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹ Prev
            </button>
            <button
              className="users-pg-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
