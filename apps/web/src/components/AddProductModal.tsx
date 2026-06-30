import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getPimProducts, type PimProduct } from '../api/pim-products'
import { addPriceListItem } from '../api/price-lists'
import { getApiError } from '../utils/format'

interface Props {
  priceListId: number
  existingProductIds: Set<number>
  onClose: () => void
  onAdded: () => void
}

function resolveProductName(p: PimProduct): string {
  return p.name?.en ?? p.name?.nl ?? p.name?.de ?? `Product #${p.id}`
}

export function AddProductModal({ priceListId, existingProductIds, onClose, onAdded }: Props) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [selected, setSelected] = useState<PimProduct | null>(null)
  const [customPrice, setCustomPrice] = useState('')
  const [discount, setDiscount] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  function handleSearchChange(value: string) {
    setSearch(value)
    if (debounceTimer) clearTimeout(debounceTimer)
    const timer = setTimeout(() => setDebouncedSearch(value), 300)
    setDebounceTimer(timer)
  }

  const { data } = useQuery({
    queryKey: ['pim-products-search', debouncedSearch],
    queryFn: () => getPimProducts({ search: debouncedSearch || undefined, limit: 20, status: 'active' }).then((r) => r.data),
  })

  const filtered = (data?.data ?? []).filter((p) => !existingProductIds.has(Number(p.id)))

  async function handleAdd() {
    if (!selected) return
    const price = parseFloat(customPrice)
    if (isNaN(price) || price < 0.01) return
    const disc = discount !== '' ? parseFloat(discount) : undefined
    setIsAdding(true)
    try {
      await addPriceListItem(priceListId, { productId: selected.id, customPrice: price, discount: disc })
      toast.success('Product added')
      onAdded()
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 520, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Add Product</h3>

        <input
          className="modal-input"
          placeholder="Search products…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          autoFocus
        />

        {!selected && (
          <div style={{ maxHeight: 220, overflowY: 'auto', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filtered.map((p) => (
              <button
                key={p.id}
                className="exact-btn exact-btn-outline"
                style={{ textAlign: 'left', padding: '6px 10px', fontSize: '0.85rem' }}
                onClick={() => { setSelected(p); setSearch(resolveProductName(p)) }}
              >
                <span style={{ color: '#e0e2f0' }}>{resolveProductName(p)}</span>
                {p.barcode && <span style={{ color: '#6b6e87', marginLeft: 8, fontSize: '0.75rem' }}>{p.barcode}</span>}
              </button>
            ))}
            {filtered.length === 0 && debouncedSearch && (
              <p style={{ color: '#6b6e87', fontSize: '0.8rem', padding: '4px 0' }}>No products found</p>
            )}
          </div>
        )}

        {selected && (
          <div style={{ margin: '12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: '#e0e2f0', fontSize: '0.9rem' }}>
              {resolveProductName(selected)}
              <button
                style={{ marginLeft: 10, fontSize: '0.75rem', color: '#6b6e87', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => { setSelected(null); setSearch('') }}
              >
                change
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label className="modal-label">Custom price *</label>
                <input
                  type="number"
                  className="modal-input"
                  placeholder="0.00"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  min="0.01"
                  step="0.01"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="modal-label">Discount %</label>
                <input
                  type="number"
                  className="modal-input"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
            </div>
            <button
              className="exact-btn exact-btn-primary"
              disabled={isAdding || !customPrice || parseFloat(customPrice) < 0.01}
              onClick={handleAdd}
            >
              {isAdding ? 'Adding…' : 'Add'}
            </button>
          </div>
        )}

        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
