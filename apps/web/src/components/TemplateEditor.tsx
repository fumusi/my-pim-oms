import { useState } from 'react'

// Every field that exists on ExactItem or PimProduct — nothing from these may appear in a template.
const ALL_RESERVED = new Set([
  // ExactItem entity
  'id', 'code', 'description', 'division',
  'standardSalesPrice', 'costPriceStandard', 'costPriceCurrency', 'averageCost',
  'isBatchNumberItem', 'isBatchItem', 'isFractionAllowedItem', 'isPackageItem',
  'isPurchaseItem', 'isSalesItem', 'isSerialItem', 'isStockItem', 'isWebshopItem',
  'isSerialNumberItem', 'isTaxableItem',
  'barcode', 'extraDescription', 'notes', 'searchCode',
  'grossWeight', 'netWeight', 'netWeightUnit',
  'itemGroup', 'itemGroupCode', 'itemGroupDescription',
  'salesVatCode', 'salesVatCodeDescription',
  'startDate', 'endDate', 'stock', 'unit', 'unitDescription', 'unitType',
  'pictureUrl', 'pictureThumbnailUrl',
  'creator', 'creatorFullName', 'modifier', 'modifierFullName', 'updatedBy',
  'created', 'modified', 'category', 'pimTemplate', 'exactId',
  // PimProduct entity — General
  'name', 'nameNl', 'nameEn', 'nameDe',
  'descNl', 'descEn', 'descDe',
  'status', 'categoryId',
  // PimProduct — Pricing
  'basePrice', 'purchasePrice', 'purchaseVatCode', 'currency',
  // PimProduct — Stock
  'lowStockThreshold', 'backorder',
  // PimProduct — Measurements
  'height', 'width', 'depth', 'length', 'thickness', 'weight', 'capacity',
  // PimProduct — Extended
  'color', 'material', 'application', 'countryOfOrigin',
  'typeOfClosure', 'gemstoneType',
  'co2EmissionProduction', 'co2EmissionTransport',
  'finishing', 'suitableFor',
  'douProduct', 'biodegradable', 'handmade', 'scratchProne',
  'customizable', 'customizableJson',
  'accessories', 'accessoriesJson',
  'ringSizing', 'ringSizingJson',
  // PimProduct — Restrictions
  'countryRestriction', 'certificates',
])

// Truly new fields — not present anywhere in ExactItem or PimProduct.
const PREDEFINED_FIELDS: { key: string; label: string }[] = [
  { key: 'packagingType', label: 'Packaging type' },
  { key: 'minOrderQuantity', label: 'Min order qty' },
  { key: 'leadTimeDays', label: 'Lead time (days)' },
  { key: 'warrantyMonths', label: 'Warranty (months)' },
  { key: 'printable', label: 'Printable' },
  { key: 'maxPrintColors', label: 'Max print colors' },
  { key: 'hsCode', label: 'HS code' },
  { key: 'allergens', label: 'Allergens' },
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
    if (key in next) delete next[key]
    else next[key] = null
    onChange(Object.keys(next).length === 0 ? null : next)
  }

  function addCustom() {
    const key = customInput.trim()
    if (!key || ALL_RESERVED.has(key) || key in active) return
    onChange({ ...active, [key]: null })
    setCustomInput('')
  }

  const isBlocked = !customInput.trim() || ALL_RESERVED.has(customInput.trim()) || customInput.trim() in active
  const customKeys = Object.keys(active).filter((k) => !PREDEFINED_KEYS.has(k))

  return (
    <div className="template-editor">
      <p className="template-section-label">Suggested fields</p>
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
          placeholder="New field name…"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
        />
        <button
          type="button"
          className="template-add-btn"
          onClick={addCustom}
          disabled={isBlocked}
        >
          Add
        </button>
      </div>
    </div>
  )
}
