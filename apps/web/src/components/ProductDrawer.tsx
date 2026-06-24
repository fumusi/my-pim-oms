import { useState, useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import { createPimProduct, updatePimProduct, type PimProduct } from '../api/pim-products'
import { getCategories, type Category } from '../api/categories'
import { getApiError } from '../utils/format'

type LangTab = 'nl' | 'en' | 'de'

const baseFields = z.object({
  nameNl: z.string(), nameEn: z.string(), nameDe: z.string(),
  descNl: z.string(), descEn: z.string(), descDe: z.string(),
  status: z.enum(['active', 'inactive']),
  endDate: z.string(),
  categoryId: z.string(),
  stock: z.string(),
  backorder: z.boolean(),
  lowStockThreshold: z.string(),
  capacity: z.string(), height: z.string(), width: z.string(),
  depth: z.string(), weight: z.string(), length: z.string(), thickness: z.string(),
  color: z.string(), material: z.string(), application: z.string(),
  finishing: z.string(), suitableFor: z.string(),
  countryOfOrigin: z.string(), co2EmissionProduction: z.string(),
  co2EmissionTransport: z.string(), typeOfClosure: z.string(), gemstoneType: z.string(),
  douProduct: z.string(), biodegradable: z.string(), handmade: z.string(), scratchProne: z.string(),
  customizableJson: z.string(), accessoriesJson: z.string(), ringSizingJson: z.string(),
})

const editSchema = baseFields.refine(
  (d) => d.nameNl || d.nameEn || d.nameDe,
  { message: 'At least one name (NL, EN or DE) is required', path: ['nameNl'] },
)

const createSchema = baseFields
  .refine(
    (d) => d.nameNl || d.nameEn || d.nameDe,
    { message: 'At least one name (NL, EN or DE) is required', path: ['nameNl'] },
  )
  .refine(
    (d) => !!d.categoryId,
    { message: 'Category is required for new products', path: ['categoryId'] },
  )

type FormValues = z.infer<typeof baseFields>

const toNum = (s: string): number | null => { const n = parseFloat(s); return isNaN(n) ? null : n }
const toStr = (s: string): string | null => s.trim() || null
const toBool = (s: string): boolean | null => s === 'true' ? true : s === 'false' ? false : null
const parseJsonField = (s: string) => { if (!s.trim()) return null; try { return JSON.parse(s) } catch { return null } }
const boolToStr = (b: boolean | null | undefined): string => b === true ? 'true' : b === false ? 'false' : ''

export interface Props {
  product?: PimProduct | null
  onClose: () => void
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, open, onToggle, children }: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="prod-drawer-section">
      <button type="button" className="prod-drawer-section-hdr" onClick={onToggle}>
        <span>{title}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          {open ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
        </svg>
      </button>
      {open && <div className="prod-drawer-section-body">{children}</div>}
    </div>
  )
}

function F({ label, error, children, required }: {
  label: string; error?: string; children: React.ReactNode; required?: boolean
}) {
  return (
    <div className="modal-field">
      <label className="modal-label">
        {label}
        {required && <span style={{ color: '#f87171', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <p className="drawer-field-error">{error}</p>}
    </div>
  )
}

function ExactField({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null
  return (
    <div className="modal-field">
      <label className="modal-label">
        {label} <span className="prod-drawer-exact-badge">Sourced from Exact</span>
      </label>
      <div className="prod-drawer-exact-val">{String(value)}</div>
    </div>
  )
}

function LangTabs({ active, setActive }: { active: LangTab; setActive: (l: LangTab) => void }) {
  return (
    <div className="lang-tabs">
      {(['en', 'nl', 'de'] as LangTab[]).map((l) => (
        <button key={l} type="button"
          className={`lang-tab${active === l ? ' lang-tab--active' : ''}`}
          onClick={() => setActive(l)}
        >{l.toUpperCase()}</button>
      ))}
    </div>
  )
}

function CountryTagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')
  const add = () => {
    const code = input.trim().toUpperCase()
    if (code.length >= 2 && !value.includes(code)) onChange([...value, code])
    setInput('')
  }
  return (
    <div>
      {value.length > 0 && (
        <div className="prod-detail-tags" style={{ marginBottom: '0.5rem' }}>
          {value.map((c) => (
            <span key={c} className="prod-detail-tag" style={{ cursor: 'pointer' }}
              onClick={() => onChange(value.filter((x) => x !== c))}>
              {c} <span style={{ opacity: 0.55, marginLeft: 2 }}>×</span>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          className="modal-input" placeholder="Country code (e.g. US, NL)"
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
          style={{ flex: 1 }}
        />
        <button type="button" className="exact-btn exact-btn-outline" onClick={add}
          style={{ padding: '0 0.75rem', flexShrink: 0 }}>Add</button>
      </div>
      <p style={{ fontSize: '0.72rem', color: '#6b6e83', margin: '0.3rem 0 0' }}>
        Press Enter or comma to add. Click tag to remove.
      </p>
    </div>
  )
}

type CertPair = { key: string; url: string }

function CertificatesEditor({ value, onChange }: {
  value: Record<string, string> | null
  onChange: (v: Record<string, string> | null) => void
}) {
  const [pairs, setPairs] = useState<CertPair[]>(() =>
    value ? Object.entries(value).map(([key, url]) => ({ key, url })) : []
  )

  const sync = (updated: CertPair[]) => {
    const valid = updated.filter((p) => p.key.trim() && p.url.trim())
    onChange(valid.length > 0 ? Object.fromEntries(valid.map((p) => [p.key.trim(), p.url.trim()])) : null)
  }

  const updatePair = (i: number, field: 'key' | 'url', val: string) => {
    const updated = pairs.map((p, j) => (j === i ? { ...p, [field]: val } : p))
    setPairs(updated); sync(updated)
  }

  const removePair = (i: number) => {
    const updated = pairs.filter((_, j) => j !== i)
    setPairs(updated); sync(updated)
  }

  return (
    <div>
      {pairs.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.375rem', alignItems: 'center' }}>
          <input className="modal-input" value={p.key}
            onChange={(e) => updatePair(i, 'key', e.target.value)}
            placeholder="Name" style={{ width: '32%' }} />
          <input className="modal-input" value={p.url}
            onChange={(e) => updatePair(i, 'url', e.target.value)}
            placeholder="URL" style={{ flex: 1 }} />
          <button type="button" onClick={() => removePair(i)}
            style={{ background: 'none', border: 'none', color: '#6b6e83', cursor: 'pointer', padding: '0.25rem', fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className="exact-btn exact-btn-outline"
        style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}
        onClick={() => setPairs([...pairs, { key: '', url: '' }])}>
        + Add certificate
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProductDrawer({ product, onClose }: Props) {
  const isEdit = !!product
  const queryClient = useQueryClient()
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'

  const [nameLang, setNameLang] = useState<LangTab>('en')
  const [descLang, setDescLang] = useState<LangTab>('en')
  const [countryRestriction, setCountryRestriction] = useState<string[]>([])
  const [certificates, setCertificates] = useState<Record<string, string> | null>(null)
  // Per-product template field values (keyed by template field name)
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({})
  // Track previous categoryId to detect user-driven changes vs initial load
  const prevCategoryIdRef = useRef<string>('')

  const [sections, setSections] = useState({
    general: true, pricing: false, stock: true,
    measurements: false, extended: false, restrictions: false,
  })
  const toggle = (s: keyof typeof sections) =>
    setSections((prev) => ({ ...prev, [s]: !prev[s] }))

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ status: 'active' }).then((r) => r.data as Category[]),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: {
      nameNl: '', nameEn: '', nameDe: '',
      descNl: '', descEn: '', descDe: '',
      status: 'active', endDate: '', categoryId: '',
      stock: '', backorder: false, lowStockThreshold: '',
      capacity: '', height: '', width: '', depth: '',
      weight: '', length: '', thickness: '',
      color: '', material: '', application: '',
      finishing: '', suitableFor: '', countryOfOrigin: '',
      co2EmissionProduction: '', co2EmissionTransport: '',
      typeOfClosure: '', gemstoneType: '',
      douProduct: '', biodegradable: '', handmade: '', scratchProne: '',
      customizableJson: '', accessoriesJson: '', ringSizingJson: '',
    },
  })

  // Pre-fill form and template values when editing
  useEffect(() => {
    if (product) {
      const catId = product.category?.id ? String(product.category.id) : ''
      prevCategoryIdRef.current = catId
      reset({
        nameNl: product.name?.nl ?? '', nameEn: product.name?.en ?? '', nameDe: product.name?.de ?? '',
        descNl: product.description?.nl ?? '', descEn: product.description?.en ?? '', descDe: product.description?.de ?? '',
        status: product.status === 'archived' ? 'inactive' : product.status,
        endDate: product.endDate ? product.endDate.slice(0, 10) : '',
        categoryId: catId,
        stock: product.stock != null ? String(product.stock) : '',
        backorder: product.backorder,
        lowStockThreshold: product.lowStockThreshold != null ? String(product.lowStockThreshold) : '',
        capacity: product.capacity != null ? String(product.capacity) : '',
        height: product.height != null ? String(product.height) : '',
        width: product.width != null ? String(product.width) : '',
        depth: product.depth != null ? String(product.depth) : '',
        weight: product.weight != null ? String(product.weight) : '',
        length: product.length != null ? String(product.length) : '',
        thickness: product.thickness != null ? String(product.thickness) : '',
        color: product.color ?? '', material: product.material ?? '',
        application: product.application ?? '', finishing: product.finishing ?? '',
        suitableFor: product.suitableFor ?? '', countryOfOrigin: product.countryOfOrigin ?? '',
        co2EmissionProduction: product.co2EmissionProduction ?? '',
        co2EmissionTransport: product.co2EmissionTransport ?? '',
        typeOfClosure: product.typeOfClosure ?? '', gemstoneType: product.gemstoneType ?? '',
        douProduct: boolToStr(product.douProduct), biodegradable: boolToStr(product.biodegradable),
        handmade: boolToStr(product.handmade), scratchProne: boolToStr(product.scratchProne),
        customizableJson: product.customizable ? JSON.stringify(product.customizable, null, 2) : '',
        accessoriesJson: product.accessories?.length ? JSON.stringify(product.accessories, null, 2) : '',
        ringSizingJson: product.ringSizing ? JSON.stringify(product.ringSizing, null, 2) : '',
      })
      setCountryRestriction(product.countryRestriction ?? [])
      setCertificates(product.certificates ?? null)
      // Pre-fill template values from product's stored pimTemplate
      if (product.pimTemplate) {
        setTemplateValues(
          Object.fromEntries(
            Object.entries(product.pimTemplate).map(([k, v]) => [k, v == null ? '' : String(v)])
          )
        )
      }
    }
  }, [product, reset])

  const watchedCategoryId = watch('categoryId')

  // Derive selected category and its template from the watched field
  const selectedCategory = useMemo(
    () => categories?.find((c) => String(c.id) === watchedCategoryId) ?? null,
    [categories, watchedCategoryId],
  )
  const categoryTemplate = selectedCategory?.template ?? null
  const templateKeys = useMemo(
    () => (categoryTemplate ? Object.keys(categoryTemplate) : []),
    [categoryTemplate],
  )

  // When user changes the category dropdown, re-initialize template values
  useEffect(() => {
    const prev = prevCategoryIdRef.current
    prevCategoryIdRef.current = watchedCategoryId
    if (watchedCategoryId === prev) return // no change (initial load)

    setTemplateValues((existing) => {
      if (!categoryTemplate) return {}
      // Keep existing values for keys that still exist in the new template
      return Object.fromEntries(
        Object.keys(categoryTemplate).map((k) => [k, existing[k] ?? ''])
      )
    })
  }, [watchedCategoryId]) // eslint-disable-line react-hooks/exhaustive-deps

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => createPimProduct(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pim-products'] })
      toast.success('Product created')
      onClose()
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => updatePimProduct(product!.id, body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['pim-products'] })
      queryClient.setQueryData(['product', product!.id], res.data)
      toast.success('Product updated')
      onClose()
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const isPending = createMutation.isPending || updateMutation.isPending
  const backorder = watch('backorder')

  function buildBody(values: FormValues): Record<string, unknown> {
    const name = {
      ...(values.nameNl ? { nl: values.nameNl } : {}),
      ...(values.nameEn ? { en: values.nameEn } : {}),
      ...(values.nameDe ? { de: values.nameDe } : {}),
    }
    const hasDesc = values.descNl || values.descEn || values.descDe
    const description = hasDesc ? {
      ...(values.descNl ? { nl: values.descNl } : {}),
      ...(values.descEn ? { en: values.descEn } : {}),
      ...(values.descDe ? { de: values.descDe } : {}),
    } : null

    // Build pimTemplate from current template field values
    const pimTemplate = categoryTemplate
      ? Object.fromEntries(templateKeys.map((k) => [k, templateValues[k]?.trim() || null]))
      : null

    return {
      name, description,
      status: values.status,
      endDate: toStr(values.endDate),
      categoryId: values.categoryId ? parseInt(values.categoryId, 10) : null,
      pimTemplate,
      stock: toNum(values.stock),
      backorder: values.backorder,
      lowStockThreshold: toNum(values.lowStockThreshold),
      capacity: toNum(values.capacity), height: toNum(values.height),
      width: toNum(values.width), depth: toNum(values.depth),
      weight: toNum(values.weight), length: toNum(values.length),
      thickness: toNum(values.thickness),
      color: toStr(values.color), material: toStr(values.material),
      application: toStr(values.application), finishing: toStr(values.finishing),
      suitableFor: toStr(values.suitableFor), countryOfOrigin: toStr(values.countryOfOrigin),
      co2EmissionProduction: toStr(values.co2EmissionProduction),
      co2EmissionTransport: toStr(values.co2EmissionTransport),
      typeOfClosure: toStr(values.typeOfClosure), gemstoneType: toStr(values.gemstoneType),
      douProduct: toBool(values.douProduct), biodegradable: toBool(values.biodegradable),
      handmade: toBool(values.handmade), scratchProne: toBool(values.scratchProne),
      countryRestriction: countryRestriction.length > 0 ? countryRestriction : null,
      certificates,
      customizable: parseJsonField(values.customizableJson),
      accessories: parseJsonField(values.accessoriesJson),
      ringSizing: parseJsonField(values.ringSizingJson),
    }
  }

  function onSubmit(values: FormValues) {
    const body = buildBody(values)
    if (isEdit) {
      updateMutation.mutate(body)
    } else {
      createMutation.mutate(body)
    }
  }

  const hasExactPricing = !!(product?.exactId)

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel drawer-panel--wide" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="drawer-header">
          <h2 className="drawer-title">{isEdit ? 'Edit product' : 'New product'}</h2>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form className="drawer-body" onSubmit={handleSubmit(onSubmit)} style={{ gap: 0, paddingBottom: 0 }}>

          {/* ── General ── */}
          <Section title="General" open={sections.general} onToggle={() => toggle('general')}>
            <F label="Name" required error={errors.nameNl?.message}>
              <LangTabs active={nameLang} setActive={setNameLang} />
              {nameLang === 'nl' && <input className="modal-input" placeholder="Naam (NL)" {...register('nameNl')} />}
              {nameLang === 'en' && <input className="modal-input" placeholder="Name (EN)" {...register('nameEn')} />}
              {nameLang === 'de' && <input className="modal-input" placeholder="Name (DE)" {...register('nameDe')} />}
            </F>

            <F label="Description">
              <LangTabs active={descLang} setActive={setDescLang} />
              {descLang === 'nl' && <textarea className="modal-input drawer-textarea" placeholder="Omschrijving (NL)" {...register('descNl')} />}
              {descLang === 'en' && <textarea className="modal-input drawer-textarea" placeholder="Description (EN)" {...register('descEn')} />}
              {descLang === 'de' && <textarea className="modal-input drawer-textarea" placeholder="Beschreibung (DE)" {...register('descDe')} />}
            </F>

            <F label="Status">
              <select className="modal-select" {...register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </F>

            <F label="End date">
              <input className="modal-input" type="date" {...register('endDate')} />
            </F>

            <F label="Category" required={!isEdit} error={errors.categoryId?.message}>
              <select className="modal-select" {...register('categoryId')}>
                <option value="">{isEdit ? '— No category —' : '— Select a category —'}</option>
                {categories?.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name.nl || c.name.en || c.name.de || `#${c.id}`}
                  </option>
                ))}
              </select>
            </F>

            {/* Template fields for the selected category */}
            {templateKeys.length > 0 && (
              <div className="prod-drawer-template-block">
                <div className="prod-drawer-template-label">
                  {selectedCategory?.name.nl || selectedCategory?.name.en || 'Category'} — template fields
                </div>
                {templateKeys.map((key) => (
                  <div key={key} className="modal-field">
                    <label className="modal-label">{key}</label>
                    <input
                      className="modal-input"
                      value={templateValues[key] ?? ''}
                      onChange={(e) => setTemplateValues((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={`Enter ${key}…`}
                    />
                  </div>
                ))}
              </div>
            )}

            <F label="Certificates">
              <CertificatesEditor value={certificates} onChange={setCertificates} />
            </F>
          </Section>

          {/* ── Pricing ── */}
          <Section title="Pricing" open={sections.pricing} onToggle={() => toggle('pricing')}>
            {hasExactPricing ? (
              <>
                <ExactField
                  label="Base price"
                  value={product?.basePrice != null
                    ? `${product.basePrice}${product.currency ? ' ' + product.currency : ''}`
                    : null}
                />
                <ExactField label="Sales VAT code" value={product?.salesVatCode} />
                {isAdmin && (
                  <>
                    <ExactField
                      label="Purchase price"
                      value={product?.purchasePrice != null
                        ? `${product.purchasePrice}${product.currency ? ' ' + product.currency : ''}`
                        : null}
                    />
                    <ExactField label="Purchase VAT code" value={product?.purchaseVatCode} />
                  </>
                )}
                {!product?.basePrice && !product?.salesVatCode && (
                  <p style={{ fontSize: '0.78rem', color: '#6b6e83', margin: 0 }}>
                    No pricing data synced from Exact yet.
                  </p>
                )}
              </>
            ) : (
              <p style={{ fontSize: '0.78rem', color: '#6b6e83', margin: 0 }}>
                Pricing is synced from Exact Online after this product is linked to an Exact item.
              </p>
            )}
          </Section>

          {/* ── Stock ── */}
          <Section title="Stock" open={sections.stock} onToggle={() => toggle('stock')}>
            <F label="Stock quantity">
              <input className="modal-input" type="number" step="1" placeholder="0" {...register('stock')} />
            </F>
            <F label="Low stock threshold">
              <input className="modal-input" type="number" step="1" min="0" placeholder="e.g. 5" {...register('lowStockThreshold')} />
            </F>
            <F label="Backorder">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  style={{ width: 15, height: 15, accentColor: '#7c3aed', cursor: 'pointer', flexShrink: 0 }}
                  {...register('backorder')}
                />
                <span style={{ fontSize: '0.8375rem', color: backorder ? '#a78bfa' : '#c5c7d8' }}>
                  {backorder ? 'Enabled — orders allowed when out of stock' : 'Disabled'}
                </span>
              </label>
            </F>
          </Section>

          {/* ── Measurements ── */}
          <Section title="Measurements" open={sections.measurements} onToggle={() => toggle('measurements')}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
              <F label="Height (mm)"><input className="modal-input" type="number" step="any" placeholder="0" {...register('height')} /></F>
              <F label="Width (mm)"><input className="modal-input" type="number" step="any" placeholder="0" {...register('width')} /></F>
              <F label="Depth (mm)"><input className="modal-input" type="number" step="any" placeholder="0" {...register('depth')} /></F>
              <F label="Length (mm)"><input className="modal-input" type="number" step="any" placeholder="0" {...register('length')} /></F>
              <F label="Thickness (mm)"><input className="modal-input" type="number" step="any" placeholder="0" {...register('thickness')} /></F>
              <F label="Weight (kg)"><input className="modal-input" type="number" step="any" placeholder="0" {...register('weight')} /></F>
              <F label="Capacity"><input className="modal-input" type="number" step="any" placeholder="0" {...register('capacity')} /></F>
            </div>
          </Section>

          {/* ── Extended attributes ── */}
          <Section title="Extended attributes" open={sections.extended} onToggle={() => toggle('extended')}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
              <F label="Color"><input className="modal-input" placeholder="e.g. Red" {...register('color')} /></F>
              <F label="Material"><input className="modal-input" placeholder="e.g. Steel" {...register('material')} /></F>
              <F label="Application"><input className="modal-input" {...register('application')} /></F>
              <F label="Country of origin"><input className="modal-input" placeholder="e.g. NL" {...register('countryOfOrigin')} /></F>
              <F label="Type of closure"><input className="modal-input" {...register('typeOfClosure')} /></F>
              <F label="Gemstone type"><input className="modal-input" {...register('gemstoneType')} /></F>
              <F label="CO₂ production"><input className="modal-input" {...register('co2EmissionProduction')} /></F>
              <F label="CO₂ transport"><input className="modal-input" {...register('co2EmissionTransport')} /></F>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
              <F label="Finishing">
                <select className="modal-select" {...register('finishing')}>
                  <option value="">— Not set —</option>
                  <option value="matte">Matte</option>
                  <option value="glossy">Glossy</option>
                  <option value="both">Both</option>
                </select>
              </F>
              <F label="Suitable for">
                <select className="modal-select" {...register('suitableFor')}>
                  <option value="">— Not set —</option>
                  <option value="indoor">Indoor</option>
                  <option value="outdoor">Outdoor</option>
                  <option value="both">Both</option>
                </select>
              </F>
              <F label="DOU product">
                <select className="modal-select" {...register('douProduct')}>
                  <option value="">— Not set —</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </F>
              <F label="Biodegradable">
                <select className="modal-select" {...register('biodegradable')}>
                  <option value="">— Not set —</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </F>
              <F label="Handmade">
                <select className="modal-select" {...register('handmade')}>
                  <option value="">— Not set —</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </F>
              <F label="Scratch prone">
                <select className="modal-select" {...register('scratchProne')}>
                  <option value="">— Not set —</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </F>
            </div>
            <F label="Customizable options (JSON)">
              <textarea className="modal-input drawer-textarea" placeholder="{}" {...register('customizableJson')} />
            </F>
            <F label="Accessories (JSON array)">
              <textarea className="modal-input drawer-textarea" placeholder="[]" {...register('accessoriesJson')} />
            </F>
            <F label="Ring sizing (JSON)">
              <textarea className="modal-input drawer-textarea" placeholder="{}" {...register('ringSizingJson')} />
            </F>
          </Section>

          {/* ── Country restrictions ── */}
          <Section title="Country restrictions" open={sections.restrictions} onToggle={() => toggle('restrictions')}>
            <CountryTagInput value={countryRestriction} onChange={setCountryRestriction} />
          </Section>

          {/* ── Footer ── */}
          <div className="drawer-footer" style={{ padding: '1rem 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '0.5rem' }}>
            <button type="button" className="modal-btn-cancel" onClick={onClose} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className="modal-btn-confirm" disabled={isPending}>
              {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
