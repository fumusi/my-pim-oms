import React, { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import {
  getPimProductById,
  archivePimProduct,
  updatePimProductStatus,
  deletePimProduct,
  updatePimProduct,
  type ProductStatus,
} from '../api/pim-products'
import { getExactItemById } from '../api/products'
import { resolveName, formatDate, getApiError, type Lang } from '../utils/format'
import { ConfirmModal } from '../components/ConfirmModal'
import { ProductDrawer } from '../components/ProductDrawer'

// ── Small reusable pieces ─────────────────────────────────────────────────────


function StatusBadge({ status, archivedAt }: { status: ProductStatus; archivedAt: string | null }) {
  if (archivedAt) return <span className="cat-status-pill cat-status-archived">Archived</span>
  if (status === 'active') return <span className="users-status-pill users-status-active">Active</span>
  return <span className="cat-status-pill cat-status-inactive">Inactive</span>
}

function Field({ label, value, children }: { label: string; value?: string | number | null; children?: React.ReactNode }) {
  const inner = children ?? (value != null && value !== '' ? value : null)
  if (inner === null || inner === undefined) return null
  return (
    <div className="cat-detail-info-field">
      <span className="modal-label">{label}</span>
      <span className="cat-detail-info-value">{inner}</span>
    </div>
  )
}

function SectionCard({ title, children, fullWidth }: { title: string; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className={`dash-card${fullWidth ? ' prod-detail-full' : ''}`}>
      <div className="dash-card-title" style={{ marginBottom: '1rem' }}>{title}</div>
      {children}
    </div>
  )
}

function StockBadge({ stock, threshold }: { stock: number | null; threshold: number | null }) {
  if (stock === null) return <span className="users-td-muted">Unknown</span>
  if (stock <= 0) return <span className="products-stock-pill products-stock-zero">Out of stock</span>
  if (threshold !== null && stock < threshold) {
    return <span className="products-stock-pill products-stock-low">Low — {stock} / {threshold}</span>
  }
  return <span style={{ color: '#34d399', fontWeight: 500 }}>In stock — {stock}</span>
}

function BoolBadge({ value, trueLabel = 'Yes', falseLabel = 'No' }: { value: boolean | null; trueLabel?: string; falseLabel?: string }) {
  if (value === null) return <span className="users-td-muted">—</span>
  return value
    ? <span className="users-status-pill users-status-active">{trueLabel}</span>
    : <span className="cat-status-pill cat-status-inactive">{falseLabel}</span>
}

function JsonBlock({ data }: { data: Record<string, unknown> | unknown[] | null }) {
  if (!data) return null
  return <pre className="prod-detail-json">{JSON.stringify(data, null, 2)}</pre>
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ProductDetailPage() {
  const { id } = useParams({ from: '/app/products/$id' })
  const productId = parseInt(id, 10)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'

  const lang = useSelector((s: RootState) => s.lang.current) as Lang
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getPimProductById(productId).then((r) => r.data),
  })

  const { data: exactItem } = useQuery({
    queryKey: ['exact-item', product?.exactId],
    queryFn: () => getExactItemById(product!.exactId!).then((r) => r.data),
    enabled: !!product?.exactId,
  })

  const archiveMutation = useMutation({
    mutationFn: () => archivePimProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] })
      queryClient.invalidateQueries({ queryKey: ['pim-products'] })
      setArchiveOpen(false)
      toast.success('Product archived')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const statusMutation = useMutation({
    mutationFn: (s: ProductStatus) => updatePimProductStatus(productId, s),
    onSuccess: (res) => {
      queryClient.setQueryData(['product', productId], res.data)
      queryClient.invalidateQueries({ queryKey: ['pim-products'] })
      setDeactivateOpen(false)
      toast.success(res.data.status === 'inactive' ? 'Product deactivated' : 'Product activated')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deletePimProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pim-products'] })
      toast.success('Product deleted')
      navigate({ to: '/products', search: { page: 1, limit: 20, search: undefined, status: undefined, categoryId: undefined, inStock: undefined } as any })
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const backorderMutation = useMutation({
    mutationFn: (backorder: boolean) => updatePimProduct(productId, { backorder }),
    onSuccess: (res) => {
      queryClient.setQueryData(['product', productId], res.data)
      toast.success(res.data.backorder ? 'Backorder enabled' : 'Backorder disabled')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  // ── Loading / error ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="profile-loading">
        <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="profile-loading">
        <p style={{ color: '#f87171' }}>Product not found.</p>
      </div>
    )
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const displayName = (product.name ? resolveName(product.name, lang) : null) || product.barcode || `#${product.id}`

  const hasMeasurements = [
    product.height, product.width, product.depth, product.weight,
    product.length, product.thickness, product.capacity,
  ].some((v) => v != null)

  const hasExtended = [
    product.color, product.material, product.application, product.finishing,
    product.suitableFor, product.countryOfOrigin, product.co2EmissionProduction,
    product.co2EmissionTransport, product.typeOfClosure, product.gemstoneType,
    product.douProduct, product.biodegradable, product.handmade, product.scratchProne,
    product.customizable, product.accessories, product.ringSizing,
  ].some((v) => v != null)

  const hasRestrictions = product.countryRestriction && product.countryRestriction.length > 0
  const hasCertificates = product.certificates && Object.keys(product.certificates).length > 0

  const fmt = (n: number | null, unit = '') =>
    n != null ? `${n}${unit ? ' ' + unit : ''}` : null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Back */}
      <div className="cat-detail-back">
        <button className="cat-detail-back-btn" // eslint-disable-next-line @typescript-eslint/no-explicit-any
onClick={() => navigate({ to: '/products', search: { page: 1, limit: 20, search: undefined, status: undefined, categoryId: undefined, inStock: undefined } as any })}>
          ← Products
        </button>
      </div>

      {/* ── Header card ── */}
      <div className="dash-card" style={{ marginBottom: '1rem' }}>
        <div className="dash-card-header">
          <div className="cat-detail-header-left">
            <div>
              <div className="cat-detail-name">{displayName}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                <StatusBadge status={product.status} archivedAt={product.archivedAt} />
                {exactItem?.code && (
                  <span className="users-td-muted" style={{ fontSize: '0.8rem' }}>
                    SKU: <span style={{ color: '#c5c7d8', fontFamily: 'monospace' }}>{exactItem.code}</span>
                  </span>
                )}
                {product.barcode && (
                  <span className="users-td-muted" style={{ fontSize: '0.8rem' }}>
                    Barcode: <span style={{ color: '#c5c7d8' }}>{product.barcode}</span>
                  </span>
                )}
                {product.exactId && (
                  <span className="users-td-muted" style={{ fontSize: '0.8rem' }}>
                    Exact ID: <span style={{ color: '#c5c7d8', fontFamily: 'monospace' }}>{product.exactId.slice(0, 8)}…</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="cat-header-controls">
            {isAdmin && !product.archivedAt && (
              <>
                <button className="exact-btn exact-btn-outline" onClick={() => setEditOpen(true)}>
                  Edit
                </button>
                {product.status === 'active' && (
                  <button className="exact-btn exact-btn-outline" onClick={() => setDeactivateOpen(true)}>
                    Deactivate
                  </button>
                )}
                {product.status === 'inactive' && (
                  <button className="exact-btn exact-btn-outline" onClick={() => statusMutation.mutate('active')} disabled={statusMutation.isPending}>
                    Activate
                  </button>
                )}
                <button className="exact-btn exact-btn-outline" onClick={() => setArchiveOpen(true)}>
                  Archive
                </button>
              </>
            )}
            {isAdmin && (
              <button className="exact-btn exact-btn-outline" style={{ color: '#f87171', borderColor: '#f87171' }} onClick={() => setDeleteOpen(true)}>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Content grid ── */}
      <div className="prod-detail-grid">

        {/* General info */}
        <SectionCard title="General">
          <Field
            label="Category"
            value={product.category ? resolveName(product.category.name, lang) || '—' : '—'}
          />
          <Field label="Currency" value={product.currency} />
          <Field label="End date" value={product.endDate ? formatDate(product.endDate) : null} />
          <Field label="Exact ID" value={product.exactId} />
          {hasCertificates && (
            <div className="cat-detail-info-field" style={{ alignItems: 'flex-start' }}>
              <span className="modal-label">Certificates</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {Object.entries(product.certificates!).map(([key, url]) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="prod-detail-cert-link"
                  >
                    {key.toUpperCase()} ↗
                  </a>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Pricing */}
        <SectionCard title="Pricing">
          <Field
            label="Base price"
            value={product.basePrice != null ? `${product.basePrice}${product.currency ? ' ' + product.currency : ''}` : null}
          />
          <Field label="Sales VAT code" value={product.salesVatCode} />
          {isAdmin && (
            <>
              <Field
                label="Purchase price"
                value={product.purchasePrice != null ? `${product.purchasePrice}${product.currency ? ' ' + product.currency : ''}` : null}
              />
              <Field label="Purchase VAT code" value={product.purchaseVatCode} />
            </>
          )}
        </SectionCard>

        {/* Stock */}
        <SectionCard title="Stock">
          <div className="prod-detail-stock-row">
            <StockBadge stock={product.stock} threshold={product.lowStockThreshold} />
          </div>
          <Field label="Stock qty" value={fmt(product.stock)} />
          <Field label="Low stock threshold" value={fmt(product.lowStockThreshold)} />
          <div className="cat-detail-info-field">
            <span className="modal-label">Backorder</span>
            {isAdmin ? (
              <button
                className={`prod-detail-toggle${product.backorder ? ' prod-detail-toggle--on' : ''}`}
                onClick={() => backorderMutation.mutate(!product.backorder)}
                disabled={backorderMutation.isPending}
              >
                {product.backorder ? 'Enabled' : 'Disabled'}
              </button>
            ) : (
              <span className="cat-detail-info-value">{product.backorder ? 'Yes' : 'No'}</span>
            )}
          </div>
        </SectionCard>

        {/* Measurements */}
        {hasMeasurements && (
          <SectionCard title="Measurements">
            <Field label="Height" value={fmt(product.height, 'mm')} />
            <Field label="Width" value={fmt(product.width, 'mm')} />
            <Field label="Depth" value={fmt(product.depth, 'mm')} />
            <Field label="Length" value={fmt(product.length, 'mm')} />
            <Field label="Thickness" value={fmt(product.thickness, 'mm')} />
            <Field label="Weight" value={fmt(product.weight, 'kg')} />
            <Field label="Capacity" value={fmt(product.capacity)} />
          </SectionCard>
        )}

        {/* Category template fields — show per-product values from pimTemplate */}
        {product.category?.template && Object.keys(product.category.template).length > 0 && (
          <SectionCard title={`${resolveName(product.category.name, lang)} — template fields`} fullWidth>
            <div className="prod-detail-attrs-grid">
              {Object.keys(product.category.template).map((key) => {
                const val = product.pimTemplate?.[key]
                return (
                  <div key={key} className="cat-detail-info-field">
                    <span className="modal-label">{key}</span>
                    <span className="cat-detail-info-value">
                      {val === null || val === undefined || val === ''
                        ? <span className="users-td-muted">—</span>
                        : typeof val === 'object'
                          ? <code style={{ fontSize: '0.78rem', color: '#a78bfa' }}>{JSON.stringify(val)}</code>
                          : String(val)}
                    </span>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        )}

        {/* Exact Online fields */}
        {exactItem && (
          <SectionCard title="Exact Online data" fullWidth>
            <div className="prod-detail-attrs-grid">
              <Field label="SKU / Code" value={exactItem.code} />
              <Field label="Description" value={exactItem.description} />
              <Field label="Extra description" value={exactItem.extraDescription} />
              <Field label="Search code" value={exactItem.searchCode} />
              <Field label="Item group" value={exactItem.itemGroupDescription ?? exactItem.itemGroupCode} />
              <Field label="Unit" value={exactItem.unitDescription ?? exactItem.unit} />
              <Field label="Sales VAT code" value={exactItem.salesVatCodeDescription ?? exactItem.salesVatCode} />
              <Field
                label="Standard sales price"
                value={exactItem.standardSalesPrice != null
                  ? `${exactItem.standardSalesPrice}${exactItem.costPriceCurrency ? ' ' + exactItem.costPriceCurrency : ''}`
                  : null}
              />
              {isAdmin && (
                <Field
                  label="Cost price"
                  value={exactItem.costPriceStandard != null
                    ? `${exactItem.costPriceStandard}${exactItem.costPriceCurrency ? ' ' + exactItem.costPriceCurrency : ''}`
                    : null}
                />
              )}
              <Field label="Stock (Exact)" value={exactItem.stock != null ? String(exactItem.stock) : null} />
            </div>
            <div className="prod-detail-attrs-grid" style={{ marginTop: '0.5rem' }}>
              {exactItem.isSalesItem !== null && (
                <div className="cat-detail-info-field">
                  <span className="modal-label">Sales item</span>
                  <span className="cat-detail-info-value"><BoolBadge value={exactItem.isSalesItem} /></span>
                </div>
              )}
              {exactItem.isStockItem !== null && (
                <div className="cat-detail-info-field">
                  <span className="modal-label">Stock item</span>
                  <span className="cat-detail-info-value"><BoolBadge value={exactItem.isStockItem} /></span>
                </div>
              )}
              {exactItem.isPurchaseItem !== null && (
                <div className="cat-detail-info-field">
                  <span className="modal-label">Purchase item</span>
                  <span className="cat-detail-info-value"><BoolBadge value={exactItem.isPurchaseItem} /></span>
                </div>
              )}
              {exactItem.isWebshopItem !== null && (
                <div className="cat-detail-info-field">
                  <span className="modal-label">Webshop item</span>
                  <span className="cat-detail-info-value"><BoolBadge value={exactItem.isWebshopItem} /></span>
                </div>
              )}
            </div>
            {exactItem.notes && (
              <div style={{ marginTop: '0.75rem' }}>
                <div className="modal-label" style={{ marginBottom: '0.25rem' }}>Notes</div>
                <p style={{ fontSize: '0.8375rem', color: '#c5c7d8', margin: 0, lineHeight: 1.6 }}>{exactItem.notes}</p>
              </div>
            )}
            {exactItem.pictureUrl && (
              <div style={{ marginTop: '0.75rem' }}>
                <div className="modal-label" style={{ marginBottom: '0.375rem' }}>Picture</div>
                <a href={exactItem.pictureUrl} target="_blank" rel="noopener noreferrer" className="prod-detail-cert-link">
                  View image ↗
                </a>
              </div>
            )}
          </SectionCard>
        )}

        {/* Extended attributes */}
        {hasExtended && (
          <SectionCard title="Extended attributes" fullWidth>
            <div className="prod-detail-attrs-grid">
              <Field label="Color" value={product.color} />
              <Field label="Material" value={product.material} />
              <Field label="Application" value={product.application} />
              <Field label="Finishing" value={product.finishing} />
              <Field label="Suitable for" value={product.suitableFor} />
              <Field label="Country of origin" value={product.countryOfOrigin} />
              <Field label="Type of closure" value={product.typeOfClosure} />
              <Field label="Gemstone type" value={product.gemstoneType} />
              <Field label="CO₂ production" value={product.co2EmissionProduction} />
              <Field label="CO₂ transport" value={product.co2EmissionTransport} />
              {product.douProduct !== null && (
                <div className="cat-detail-info-field">
                  <span className="modal-label">DOU product</span>
                  <span className="cat-detail-info-value"><BoolBadge value={product.douProduct} /></span>
                </div>
              )}
              {product.biodegradable !== null && (
                <div className="cat-detail-info-field">
                  <span className="modal-label">Biodegradable</span>
                  <span className="cat-detail-info-value"><BoolBadge value={product.biodegradable} /></span>
                </div>
              )}
              {product.handmade !== null && (
                <div className="cat-detail-info-field">
                  <span className="modal-label">Handmade</span>
                  <span className="cat-detail-info-value"><BoolBadge value={product.handmade} /></span>
                </div>
              )}
              {product.scratchProne !== null && (
                <div className="cat-detail-info-field">
                  <span className="modal-label">Scratch prone</span>
                  <span className="cat-detail-info-value"><BoolBadge value={product.scratchProne} /></span>
                </div>
              )}
            </div>
            {product.customizable && (
              <div style={{ marginTop: '0.75rem' }}>
                <div className="modal-label" style={{ marginBottom: '0.375rem' }}>Customizable options</div>
                <JsonBlock data={product.customizable} />
              </div>
            )}
            {product.accessories && product.accessories.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div className="modal-label" style={{ marginBottom: '0.375rem' }}>Accessories</div>
                <JsonBlock data={product.accessories} />
              </div>
            )}
            {product.ringSizing && (
              <div style={{ marginTop: '0.75rem' }}>
                <div className="modal-label" style={{ marginBottom: '0.375rem' }}>Ring sizing</div>
                <JsonBlock data={product.ringSizing} />
              </div>
            )}
          </SectionCard>
        )}

        {/* Country restrictions */}
        {hasRestrictions && (
          <SectionCard title="Country restrictions">
            <div className="prod-detail-tags">
              {product.countryRestriction!.map((c) => (
                <span key={c} className="prod-detail-tag">{c}</span>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Translations */}
        <SectionCard title="Translations" fullWidth>
          <div className="prod-detail-trans-grid">
            <div className="prod-detail-trans-header" />
            <div className="prod-detail-trans-header">Name</div>
            <div className="prod-detail-trans-header">Description</div>

            {(['en', 'nl', 'de'] as Lang[]).map((l) => (
              <React.Fragment key={l}>
                <div className="prod-detail-trans-lang">{l.toUpperCase()}</div>
                <div className={`prod-detail-trans-val${!product.name?.[l] ? ' prod-detail-trans-empty' : ''}`}>
                  {product.name?.[l] || '—'}
                </div>
                <div className={`prod-detail-trans-val${!product.description?.[l] ? ' prod-detail-trans-empty' : ''}`}>
                  {product.description?.[l] || '—'}
                </div>
              </React.Fragment>
            ))}
          </div>
        </SectionCard>

        {/* Meta */}
        <SectionCard title="Meta">
          <Field label="Created" value={formatDate(product.createdAt)} />
          <Field label="Updated" value={formatDate(product.updatedAt)} />
          <Field label="Updated by" value={product.updatedBy} />
          {product.archivedAt && (
            <Field label="Archived" value={formatDate(product.archivedAt)} />
          )}
        </SectionCard>

      </div>

      {/* Edit drawer */}
      {editOpen && (
        <ProductDrawer
          product={product}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* Archive confirm */}
      {archiveOpen && (
        <ConfirmModal
          title="Archive product"
          message={`Archive "${displayName}"? This cannot be undone.`}
          confirmLabel="Archive"
          loading={archiveMutation.isPending}
          onConfirm={() => archiveMutation.mutate()}
          onCancel={() => setArchiveOpen(false)}
        />
      )}

      {/* Deactivate confirm */}
      {deactivateOpen && (
        <ConfirmModal
          title="Deactivate product"
          message={`Deactivate "${displayName}"?`}
          confirmLabel="Deactivate"
          loading={statusMutation.isPending}
          onConfirm={() => statusMutation.mutate('inactive')}
          onCancel={() => setDeactivateOpen(false)}
        />
      )}

      {/* Delete confirm */}
      {deleteOpen && (
        <ConfirmModal
          title="Delete product"
          message={`Permanently delete "${displayName}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setDeleteOpen(false)}
        />
      )}
    </>
  )
}
