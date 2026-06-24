import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import {
  getCategories,
  createCategory,
  type Category,
  type CategoryStatus,
  type CreateCategoryBody,
} from '../api/categories'
import { CategoryDrawer } from '../components/CategoryDrawer'
import { resolveName, formatDate, getApiError, type Lang } from '../utils/format'

interface StatusBadgeProps { category: Category }
function StatusBadge({ category }: StatusBadgeProps) {
  if (category.archivedAt) return <span className="cat-status-pill cat-status-archived">Archived</span>
  if (category.status === 'active') return <span className="cat-status-pill cat-status-active">Active</span>
  return <span className="cat-status-pill cat-status-inactive">Inactive</span>
}

export function CategoriesPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'
  const lang = useSelector((s: RootState) => s.lang.current) as Lang
  const [statusFilter, setStatusFilter] = useState<CategoryStatus | undefined>(undefined)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: categories = [], isLoading, isError } = useQuery({
    queryKey: ['categories', isAdmin ? statusFilter : null],
    queryFn: () =>
      getCategories(isAdmin && statusFilter ? { status: statusFilter } : undefined).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateCategoryBody) => createCategory(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setDrawerOpen(false)
      toast.success('Category created')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  return (
    <>
      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <div className="dash-card-title">Categories</div>
            <div className="dash-card-sub">{categories.length} total</div>
          </div>

          <div className="cat-header-controls">
            {isAdmin && (
              <div className="status-filter">
                <button
                  className={`status-filter-btn${statusFilter === undefined ? ' status-filter-btn--active' : ''}`}
                  onClick={() => setStatusFilter(undefined)}
                >
                  All
                </button>
                <button
                  className={`status-filter-btn${statusFilter === 'active' ? ' status-filter-btn--active' : ''}`}
                  onClick={() => setStatusFilter('active')}
                >
                  Active
                </button>
                <button
                  className={`status-filter-btn${statusFilter === 'inactive' ? ' status-filter-btn--active' : ''}`}
                  onClick={() => setStatusFilter('inactive')}
                >
                  Inactive
                </button>
              </div>
            )}

            {isAdmin && (
              <button
                className="exact-btn exact-btn-primary"
                onClick={() => { setEditTarget(null); setDrawerOpen(true) }}
              >
                + New category
              </button>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="profile-loading">
            <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
          </div>
        )}

        {isError && (
          <div className="profile-loading">
            <p style={{ color: '#f87171' }}>Failed to load categories.</p>
          </div>
        )}

        {!isLoading && !isError && categories.length === 0 && (
          <div className="shell-empty-state">
            <p className="shell-empty-title">No categories yet</p>
            {isAdmin && (
              <p className="shell-empty-hint">Create your first category to start organising products.</p>
            )}
          </div>
        )}

        {!isLoading && !isError && categories.length > 0 && (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Icon</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Products</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr
                    key={cat.id}
                    onClick={() => navigate({ to: '/categories/$id', params: { id: String(cat.id) } })}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ width: 48 }}>
                      {cat.image ? (
                        <img src={cat.image} alt="" className="cat-thumbnail" />
                      ) : cat.icon ? (
                        <span className="cat-icon-cell">{cat.icon}</span>
                      ) : (
                        <span className="cat-icon-placeholder" />
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#e0e2f0' }}>
                        {resolveName(cat.name, lang)}
                      </div>
                    </td>
                    <td><StatusBadge category={cat} /></td>
                    <td className="users-td-muted">{cat.productCount}</td>
                    <td className="users-td-muted">{formatDate(cat.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer — create only */}
      {drawerOpen && (
        <CategoryDrawer
          category={null}
          loading={createMutation.isPending}
          onSave={(body) => createMutation.mutate(body as CreateCategoryBody)}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  )
}
