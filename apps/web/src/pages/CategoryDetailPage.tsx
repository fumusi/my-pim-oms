import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import {
  getCategoryDetail,
  updateCategory,
  archiveCategory,
  assignProducts,
  unassignProducts,
  type LocalizedText,
  type UpdateCategoryBody,
  type AssignResult,
} from '../api/categories'
import { ConfirmModal } from '../components/ConfirmModal'
import { CategoryDrawer } from '../components/CategoryDrawer'
import { AssignProductsModal } from '../components/AssignProductsModal'

type Lang = 'nl' | 'en' | 'de'

function resolveLang(text: LocalizedText, lang: Lang): string {
  return text[lang] ?? text.nl ?? text.en ?? text.de ?? '—'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function getApiError(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } }
  return e?.response?.data?.message ?? 'Something went wrong'
}

export function CategoryDetailPage() {
  const { id } = useParams({ from: '/app/categories/$id' })
  const categoryId = parseInt(id, 10)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'

  const [lang, setLang] = useState<Lang>('nl')
  const [productPage, setProductPage] = useState(1)
  const [productSearch, setProductSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)

  const { data: category, isLoading, isError } = useQuery({
    queryKey: ['category', categoryId, productPage, productSearch],
    queryFn: () =>
      getCategoryDetail(categoryId, {
        page: productPage,
        limit: 20,
        search: productSearch || undefined,
      }).then((r) => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: (body: UpdateCategoryBody) => updateCategory(categoryId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category', categoryId] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setDrawerOpen(false)
      toast.success('Category updated')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const archiveMutation = useMutation({
    mutationFn: () => archiveCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category', categoryId] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category archived')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const assignMutation = useMutation({
    mutationFn: (productIds: string[]) => assignProducts(categoryId, productIds),
    onSuccess: (res) => {
      const { assigned, skipped } = res.data as AssignResult
      queryClient.invalidateQueries({ queryKey: ['category', categoryId] })
      queryClient.invalidateQueries({ queryKey: ['products-available', categoryId] })
      setAssignModalOpen(false)
      toast.success(`Assigned ${assigned} product${assigned === 1 ? '' : 's'}${skipped.length > 0 ? `, skipped ${skipped.length}` : ''}`)
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const unassignMutation = useMutation({
    mutationFn: (productId: string) => unassignProducts(categoryId, [productId]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category', categoryId] })
      setRemoveTarget(null)
      toast.success('Product removed from category')
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

  if (isError || !category) {
    return (
      <div className="profile-loading">
        <p style={{ color: '#f87171' }}>Category not found.</p>
      </div>
    )
  }

  const products = category.products?.data ?? []
  const productMeta = category.products?.meta
  const templateKeys = category.template ? Object.keys(category.template) : []

  return (
    <>
      {/* Back + header */}
      <div className="cat-detail-back">
        <button className="cat-detail-back-btn" onClick={() => navigate({ to: '/categories' })}>
          ← Categories
        </button>
      </div>

      {/* Header card */}
      <div className="dash-card" style={{ marginBottom: '1rem' }}>
        <div className="dash-card-header">
          <div className="cat-detail-header-left">
            {category.image ? (
              <img src={category.image} alt="" className="cat-detail-image" />
            ) : category.icon ? (
              <span className="cat-detail-icon">{category.icon}</span>
            ) : null}
            <div>
              <div className="cat-detail-name">{resolveLang(category.name, lang)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span className={`cat-status-pill ${category.archivedAt ? 'cat-status-archived' : category.status === 'active' ? 'cat-status-active' : 'cat-status-inactive'}`}>
                  {category.archivedAt ? 'Archived' : category.status === 'active' ? 'Active' : 'Inactive'}
                </span>
                <span className="users-td-muted" style={{ fontSize: '0.8rem' }}>
                  {category.productCount} product{category.productCount === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>

          <div className="cat-header-controls">
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

            {isAdmin && !category.archivedAt && (
              <>
                <button className="exact-btn exact-btn-outline" onClick={() => setDrawerOpen(true)}>
                  Edit
                </button>
                <button
                  className="exact-btn exact-btn-outline"
                  onClick={() => archiveMutation.mutate()}
                  disabled={archiveMutation.isPending}
                >
                  Archive
                </button>
                <button
                  className="exact-btn exact-btn-primary"
                  onClick={() => setAssignModalOpen(true)}
                >
                  + Assign products
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Info + template */}
      <div className="cat-detail-meta-row">
        {/* General info */}
        <div className="dash-card cat-detail-info-card">
          <div className="dash-card-title" style={{ marginBottom: '1rem' }}>General info</div>
          {category.description && (
            <div className="cat-detail-info-field">
              <span className="modal-label">Description</span>
              <span className="cat-detail-info-value">{resolveLang(category.description, lang)}</span>
            </div>
          )}
          <div className="cat-detail-info-field">
            <span className="modal-label">Created</span>
            <span className="cat-detail-info-value">{formatDate(category.createdAt)}</span>
          </div>
          <div className="cat-detail-info-field">
            <span className="modal-label">Updated</span>
            <span className="cat-detail-info-value">{formatDate(category.updatedAt)}</span>
          </div>
          {category.updatedBy && (
            <div className="cat-detail-info-field">
              <span className="modal-label">Updated by</span>
              <span className="cat-detail-info-value">{category.updatedBy}</span>
            </div>
          )}
        </div>

        {/* Template — admin only */}
        {isAdmin && (
          <div className="dash-card cat-detail-info-card">
            <div className="dash-card-title" style={{ marginBottom: '1rem' }}>Template fields</div>
            {templateKeys.length === 0 ? (
              <p className="users-td-muted" style={{ fontSize: '0.8rem' }}>No template configured.</p>
            ) : (
              <div className="template-chips">
                {templateKeys.map((k) => (
                  <span key={k} className="template-chip template-chip--active">
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Products */}
      <div className="dash-card">
        <div className="dash-card-header">
          <div className="dash-card-title">Assigned products</div>
          <input
            className="cat-search-input"
            placeholder="Search products…"
            value={productSearch}
            onChange={(e) => { setProductSearch(e.target.value); setProductPage(1) }}
          />
        </div>

        {products.length === 0 ? (
          <div className="shell-empty-state" style={{ padding: '2.5rem 1rem' }}>
            <p className="shell-empty-title">
              {productSearch ? 'No products match your search.' : 'No products assigned yet.'}
            </p>
          </div>
        ) : (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Status</th>
                  <th>Stock</th>
                  {isAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td style={{ color: '#e0e2f0' }}>{p.description ?? '—'}</td>
                    <td className="users-td-muted">{p.code ?? '—'}</td>
                    <td>
                      {p.isSalesItem === null ? (
                        <span className="users-status-pill" style={{ color: '#6b6e83', background: 'rgba(107,110,131,0.12)' }}>—</span>
                      ) : p.isSalesItem ? (
                        <span className="users-status-pill users-status-active">Active</span>
                      ) : (
                        <span className="users-status-pill users-status-inactive">Inactive</span>
                      )}
                    </td>
                    <td className="users-td-muted">{p.stock ?? '—'}</td>
                    {isAdmin && (
                      <td>
                        <button
                          className="users-action-btn users-action-btn-danger"
                          onClick={() => setRemoveTarget(p.id)}
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {productMeta && productMeta.totalPages > 1 && (
          <div className="users-pagination">
            <span className="users-pagination-info">
              Page {productMeta.page} of {productMeta.totalPages}
            </span>
            <div className="users-pagination-btns">
              <button className="users-pg-btn" disabled={productPage <= 1} onClick={() => setProductPage((p) => p - 1)}>
                ‹ Prev
              </button>
              <button
                className="users-pg-btn"
                disabled={productPage >= productMeta.totalPages}
                onClick={() => setProductPage((p) => p + 1)}
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit drawer */}
      {drawerOpen && (
        <CategoryDrawer
          category={category}
          loading={updateMutation.isPending}
          onSave={(body) => updateMutation.mutate(body as UpdateCategoryBody)}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {/* Assign modal */}
      {assignModalOpen && (
        <AssignProductsModal
          categoryId={categoryId}
          loading={assignMutation.isPending}
          onConfirm={(ids) => assignMutation.mutate(ids)}
          onCancel={() => setAssignModalOpen(false)}
        />
      )}

      {/* Remove confirm */}
      {removeTarget && (
        <ConfirmModal
          title="Remove product"
          message="Remove this product from the category? The product will not be deleted."
          confirmLabel="Remove"
          danger
          loading={unassignMutation.isPending}
          onConfirm={() => unassignMutation.mutate(removeTarget)}
          onCancel={() => setRemoveTarget(null)}
        />
      )}
    </>
  )
}
