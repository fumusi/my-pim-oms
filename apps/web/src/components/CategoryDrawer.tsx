import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Category, CreateCategoryBody, UpdateCategoryBody } from '../api/categories'
import { TemplateEditor } from './TemplateEditor'

const schema = z
  .object({
    nameNl: z.string(),
    nameEn: z.string(),
    nameDe: z.string(),
    descNl: z.string(),
    descEn: z.string(),
    descDe: z.string(),
    image: z.string(),
    icon: z.string(),
    status: z.enum(['active', 'inactive']),
  })
  .refine((d) => d.nameNl || d.nameEn || d.nameDe, {
    message: 'At least one language name is required',
    path: ['nameNl'],
  })

type FormValues = z.infer<typeof schema>
type LangTab = 'nl' | 'en' | 'de'

interface Props {
  category?: Category | null
  loading: boolean
  onSave: (body: CreateCategoryBody | UpdateCategoryBody) => void
  onClose: () => void
}

export function CategoryDrawer({ category, loading, onSave, onClose }: Props) {
  const isEdit = !!category
  const [nameLang, setNameLang] = useState<LangTab>('nl')
  const [descLang, setDescLang] = useState<LangTab>('nl')
  const [template, setTemplate] = useState<Record<string, unknown> | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nameNl: '',
      nameEn: '',
      nameDe: '',
      descNl: '',
      descEn: '',
      descDe: '',
      image: '',
      icon: '',
      status: 'active',
    },
  })

  useEffect(() => {
    if (category) {
      reset({
        nameNl: category.name.nl ?? '',
        nameEn: category.name.en ?? '',
        nameDe: category.name.de ?? '',
        descNl: category.description?.nl ?? '',
        descEn: category.description?.en ?? '',
        descDe: category.description?.de ?? '',
        image: category.image ?? '',
        icon: category.icon ?? '',
        status: 'active',
      })
      setTemplate(category.template)
    } else {
      reset({
        nameNl: '',
        nameEn: '',
        nameDe: '',
        descNl: '',
        descEn: '',
        descDe: '',
        image: '',
        icon: '',
        status: 'active',
      })
      setTemplate(null)
    }
  }, [category, reset])

  function onSubmit(values: FormValues) {
    const name = {
      ...(values.nameNl ? { nl: values.nameNl } : {}),
      ...(values.nameEn ? { en: values.nameEn } : {}),
      ...(values.nameDe ? { de: values.nameDe } : {}),
    }
    const hasDesc = values.descNl || values.descEn || values.descDe
    const description = hasDesc
      ? {
          ...(values.descNl ? { nl: values.descNl } : {}),
          ...(values.descEn ? { en: values.descEn } : {}),
          ...(values.descDe ? { de: values.descDe } : {}),
        }
      : null

    const body: CreateCategoryBody | UpdateCategoryBody = {
      name,
      description,
      image: values.image || null,
      icon: values.icon || null,
      template,
      ...(!isEdit && { status: values.status }),
    }

    onSave(body)
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2 className="drawer-title">{isEdit ? 'Edit category' : 'New category'}</h2>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form className="drawer-body" onSubmit={handleSubmit(onSubmit)}>
          {/* Name */}
          <div className="modal-field">
            <label className="modal-label">Name *</label>
            <div className="lang-tabs">
              {(['nl', 'en', 'de'] as LangTab[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`lang-tab${nameLang === l ? ' lang-tab--active' : ''}`}
                  onClick={() => setNameLang(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            {nameLang === 'nl' && (
              <input className="modal-input" placeholder="Naam (NL)" {...register('nameNl')} />
            )}
            {nameLang === 'en' && (
              <input className="modal-input" placeholder="Name (EN)" {...register('nameEn')} />
            )}
            {nameLang === 'de' && (
              <input className="modal-input" placeholder="Name (DE)" {...register('nameDe')} />
            )}
            {errors.nameNl && (
              <p className="drawer-field-error">{errors.nameNl.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="modal-field">
            <label className="modal-label">Description</label>
            <div className="lang-tabs">
              {(['nl', 'en', 'de'] as LangTab[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`lang-tab${descLang === l ? ' lang-tab--active' : ''}`}
                  onClick={() => setDescLang(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            {descLang === 'nl' && (
              <textarea className="modal-input drawer-textarea" placeholder="Omschrijving (NL)" {...register('descNl')} />
            )}
            {descLang === 'en' && (
              <textarea className="modal-input drawer-textarea" placeholder="Description (EN)" {...register('descEn')} />
            )}
            {descLang === 'de' && (
              <textarea className="modal-input drawer-textarea" placeholder="Beschreibung (DE)" {...register('descDe')} />
            )}
          </div>

          {/* Image */}
          <div className="modal-field">
            <label className="modal-label">Image URL</label>
            <input className="modal-input" placeholder="https://…" {...register('image')} />
          </div>

          {/* Icon */}
          <div className="modal-field">
            <label className="modal-label">Icon</label>
            <input className="modal-input" placeholder="e.g. 🔧 or icon-name" {...register('icon')} />
          </div>

          {/* Status — create only */}
          {!isEdit && (
            <div className="modal-field">
              <label className="modal-label">Status</label>
              <select className="modal-select" {...register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}

          {/* Template */}
          <div className="modal-field">
            <label className="modal-label">Template fields</label>
            <TemplateEditor value={template} onChange={setTemplate} />
          </div>

          <div className="drawer-footer">
            <button type="button" className="modal-btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="modal-btn-confirm" disabled={loading}>
              {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
