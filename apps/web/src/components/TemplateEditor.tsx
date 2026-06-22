import { useState } from 'react'

const PREDEFINED_FIELDS: { key: string; label: string }[] = [
  { key: 'barcode', label: 'Barcode' },
  { key: 'grossWeight', label: 'Gross weight' },
  { key: 'netWeight', label: 'Net weight' },
  { key: 'netWeightUnit', label: 'Weight unit' },
  { key: 'unit', label: 'Unit' },
  { key: 'unitDescription', label: 'Unit description' },
  { key: 'stock', label: 'Stock' },
  { key: 'standardSalesPrice', label: 'Sales price' },
  { key: 'costPriceStandard', label: 'Cost price' },
  { key: 'extraDescription', label: 'Extra description' },
  { key: 'notes', label: 'Notes' },
  { key: 'searchCode', label: 'Search code' },
  { key: 'salesVatCode', label: 'VAT code' },
  { key: 'startDate', label: 'Start date' },
  { key: 'endDate', label: 'End date' },
  { key: 'isWebshopItem', label: 'Webshop item' },
  { key: 'isSalesItem', label: 'Sales item' },
  { key: 'isPurchaseItem', label: 'Purchase item' },
  { key: 'isStockItem', label: 'Stock item' },
]

const PREDEFINED_KEYS = new Set(PREDEFINED_FIELDS.map((f) => f.key))

interface Props {
  value: Record<string, unknown> | null
  onChange: (v: Record<string, unknown> | null) => void
}

export function TemplateEditor({ value, onChange }: Props) {
  const [customInput, setCustomInput] = useState('')
  const active = value ?? {}

  function toggle(key: string) {
    const next = { ...active }
    if (key in next) {
      delete next[key]
    } else {
      next[key] = null
    }
    onChange(Object.keys(next).length === 0 ? null : next)
  }

  function addCustom() {
    const key = customInput.trim()
    if (!key || key in active) return
    onChange({ ...active, [key]: null })
    setCustomInput('')
  }

  const customKeys = Object.keys(active).filter((k) => !PREDEFINED_KEYS.has(k))

  return (
    <div className="template-editor">
      <p className="template-section-label">Exact fields</p>
      <div className="template-chips">
        {PREDEFINED_FIELDS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`template-chip${f.key in active ? ' template-chip--active' : ''}`}
            onClick={() => toggle(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {customKeys.length > 0 && (
        <>
          <p className="template-section-label" style={{ marginTop: '0.75rem' }}>Custom fields</p>
          <div className="template-chips">
            {customKeys.map((k) => (
              <span key={k} className="template-chip template-chip--active template-chip--custom">
                {k}
                <button
                  type="button"
                  className="template-chip-remove"
                  onClick={() => toggle(k)}
                  aria-label={`Remove ${k}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </>
      )}

      <div className="template-add-row">
        <input
          className="modal-input"
          placeholder="Custom field name…"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
        />
        <button
          type="button"
          className="template-add-btn"
          onClick={addCustom}
          disabled={!customInput.trim() || customInput.trim() in active}
        >
          Add
        </button>
      </div>
    </div>
  )
}
