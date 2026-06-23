import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import {
  getCategories,
  createCategory,
  updateCategory,
  setCategoryStatus,
  archiveCategory,
  deleteCategory,
  type Category,
  type CategoryStatus,
  type CreateCategoryBody,
  type UpdateCategoryBody,
} from '../api/categories'
import { ConfirmModal } from '../components/ConfirmModal'
import { CategoryDrawer } from '../components/CategoryDrawer'
import { resolveName, formatDate, getApiError, type Lang } from '../utils/format'

interface StatusBadgeProps { category: Category }
function StatusBadge({ category }: StatusBadgeProps) {
  if (category.archivedAt) return <span className="cat-status-pill cat-status-archived">Archived</span>
  if (category.status === 'active') return <span className="cat-status-pill cat-status-active">Active</span>
  return <span className="cat-status-pill cat-status-inactive">Inactive</span>
}

type ConfirmType = 'deactivate' | 'activate' | 'archive' | 'delete' | 'delete-blocked'

interface ConfirmState {
  type: ConfirmType
  category: Category
}

export function CategoriesPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'

  const [lang, setLang] = useState<Lang>('nl')
  const [statusFilter, setStatusFilter] = useState<CategoryStatus | undefined>(undefined)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

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

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateCategoryBody }) => updateCategory(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setEditTarget(null)
      toast.success('Category updated')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: CategoryStatus }) => setCategoryStatus(id, status),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setConfirm(null)
      toast.success(status === 'inactive' ? 'Category deactivated' : 'Category activated')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const archiveMutation = useMutation({
    mutationFn: (id: number) => archiveCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setConfirm(null)
      toast.success('Category archived')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setConfirm(null)
      toast.success('Category deleted')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  function handleDrawerSave(body: CreateCategoryBody | UpdateCategoryBody) {
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, body: body as UpdateCategoryBody })
    } else {
      createMutation.mutate(body as CreateCategoryBody)
    }
  }

  function handleActionClick(type: ConfirmType, cat: Category) {
    if (type === 'delete' && cat.productCount > 0) {
      setConfirm({ type: 'delete-blocked', category: cat })
    } else {
      setConfirm({ type, category: cat })
    }
  }

  const mutationLoading =
    statusMutation.isPending || archiveMutation.isPending || deleteMutation.isPending

  return (
    <>
      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <div className="dash-card-title">Categories</div>
            <div className="dash-card-sub">{categories.length} total</div>
          </div>

          <div className="cat-header-controls">
            {/* Language switcher */}
            <div className="lang-switcher">
              {(['nl', 'en', 'de'] as Lang[]).map((l) => (
                <button
                  key={l}
                  className={`lang-switcher-btn${lang === l ? ' lang-switcher-btn--active' : ''}`}
                  onClick={() => setLang(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Status filter — admin only */}
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
                  {isAdmin && <th>Actions</th>}
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
                    {isAdmin && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="users-actions">
                          <button
                            className="users-action-btn"
                            onClick={() => { setEditTarget(cat); setDrawerOpen(true) }}
                            title="Edit"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit
                          </button>

                          {!cat.archivedAt && cat.status === 'active' && (
                            <button
                              className="users-action-btn"
                              onClick={() => handleActionClick('deactivate', cat)}
                              title="Deactivate"
                            >
                              Deactivate
                            </button>
                          )}

                          {!cat.archivedAt && cat.status === 'inactive' && (
                            <button
                              className="users-action-btn"
                              onClick={() => handleActionClick('activate', cat)}
                              title="Activate"
                            >
                              Activate
                            </button>
                          )}

                          {!cat.archivedAt && (
                            <button
                              className="users-action-btn"
                              onClick={() => handleActionClick('archive', cat)}
                              title="Archive"
                            >
                              Archive
                            </button>
                          )}

                          <button
                            className="users-action-btn users-action-btn-danger"
                            onClick={() => handleActionClick('delete', cat)}
                            title="Delete"
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
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <CategoryDrawer
          category={editTarget}
          loading={createMutation.isPending || updateMutation.isPending}
          onSave={handleDrawerSave}
          onClose={() => { setDrawerOpen(false); setEditTarget(null) }}
        />
      )}

      {/* Deactivate confirm */}
      {confirm?.type === 'deactivate' && (
        <ConfirmModal
          title="Deactivate category"
          message={
            confirm.category.productCount > 0
              ? `This will deactivate all ${confirm.category.productCount} product${confirm.category.productCount === 1 ? '' : 's'} in "${resolveName(confirm.category.name, lang)}".`
              : `Deactivate "${resolveName(confirm.category.name, lang)}"?`
          }
          confirmLabel="Deactivate"
          loading={mutationLoading}
          onConfirm={() => statusMutation.mutate({ id: confirm.category.id, status: 'inactive' })}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Activate confirm */}
      {confirm?.type === 'activate' && (
        <ConfirmModal
          title="Activate category"
          message={`Activate "${resolveName(confirm.category.name, lang)}"?`}
          confirmLabel="Activate"
          loading={mutationLoading}
          onConfirm={() => statusMutation.mutate({ id: confirm.category.id, status: 'active' })}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Archive confirm */}
      {confirm?.type === 'archive' && (
        <ConfirmModal
          title="Archive category"
          message={`Archive "${resolveName(confirm.category.name, lang)}"? This cannot be undone.`}
          confirmLabel="Archive"
          loading={mutationLoading}
          onConfirm={() => archiveMutation.mutate(confirm.category.id)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Delete confirm */}
      {confirm?.type === 'delete' && (
        <ConfirmModal
          title="Delete category"
          message={`Permanently delete "${resolveName(confirm.category.name, lang)}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          loading={mutationLoading}
          onConfirm={() => deleteMutation.mutate(confirm.category.id)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Delete blocked */}
      {confirm?.type === 'delete-blocked' && (
        <ConfirmModal
          title="Cannot delete category"
          message={`"${resolveName(confirm.category.name, lang)}" has ${confirm.category.productCount} product${confirm.category.productCount === 1 ? '' : 's'} assigned. Remove all products from this category before deleting.`}
          confirmLabel="OK"
          loading={false}
          onConfirm={() => setConfirm(null)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}
