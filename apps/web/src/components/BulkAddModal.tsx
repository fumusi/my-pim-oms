import { useState } from 'react'
import { toast } from 'sonner'
import { bulkAddPriceListItems } from '../api/price-lists'
import { getApiError } from '../utils/format'

interface Props {
  priceListId: number
  onClose: () => void
  onDone: () => void
}

function parseCsv(text: string): Array<{ productId: number; customPrice: number; discount?: number }> {
  return text
    .split('\n')
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const [productId, customPrice, discount] = line.split(',')
      return {
        productId: parseInt(productId.trim(), 10),
        customPrice: parseFloat(customPrice.trim()),
        ...(discount?.trim() ? { discount: parseFloat(discount.trim()) } : {}),
      }
    })
    .filter((r) => !isNaN(r.productId) && !isNaN(r.customPrice))
}

export function BulkAddModal({ priceListId, onClose, onDone }: Props) {
  const [parsedRows, setParsedRows] = useState<Array<{ productId: number; customPrice: number; discount?: number }>>([])
  const [isUploading, setIsUploading] = useState(false)

  function handleDownloadTemplate() {
    const csv = 'productId,customPrice,discount\n1,9.99,10\n2,14.50,'
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'price-list-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setParsedRows(parseCsv(text))
    }
    reader.readAsText(file)
  }

  async function handleUpload() {
    if (parsedRows.length === 0) return
    setIsUploading(true)
    try {
      const result = await bulkAddPriceListItems(priceListId, { items: parsedRows })
      toast.success(`Added ${result.added}, skipped ${result.skipped} (duplicates)`)
      onDone()
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 480, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Bulk Add Products</h3>

        <div style={{ marginBottom: 16 }}>
          <button className="exact-btn exact-btn-secondary" onClick={handleDownloadTemplate}>
            Download template
          </button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="modal-label">Upload CSV</label>
          <input type="file" accept=".csv" onChange={handleFile} style={{ display: 'block', marginTop: 6 }} />
        </div>

        {parsedRows.length > 0 && (
          <p style={{ color: '#6b6e87', fontSize: '0.85rem', marginBottom: 12 }}>
            {parsedRows.length} rows parsed
          </p>
        )}

        {parsedRows.length > 0 && (
          <button
            className="exact-btn exact-btn-primary"
            disabled={isUploading}
            onClick={handleUpload}
            style={{ marginBottom: 8 }}
          >
            {isUploading ? 'Uploading…' : 'Upload'}
          </button>
        )}

        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
