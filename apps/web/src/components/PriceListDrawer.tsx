import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createPriceList,
  updatePriceList,
  type PriceList,
} from '../api/price-lists'
import { getApiError } from '../utils/format'

interface Props {
  priceList?: PriceList | null
  onClose: () => void
  onSaved: () => void
}

const schema = z
  .object({
    name: z.string().min(1, 'Name is required').max(200),
    description: z.string().max(1000).optional(),
    startDate: z.string().date().optional().or(z.literal('')),
    endDate: z.string().date().optional().or(z.literal('')),
  })
  .refine(
    (d) => {
      if (!d.startDate || !d.endDate) return true
      return d.startDate <= d.endDate
    },
    { message: 'End date must be after start date', path: ['endDate'] },
  )

type FormValues = z.infer<typeof schema>

export function PriceListDrawer({ priceList, onClose, onSaved }: Props) {
  const isEdit = priceList != null

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: priceList?.name ?? '',
      description: priceList?.description ?? '',
      startDate: priceList?.startDate ?? '',
      endDate: priceList?.endDate ?? '',
    },
  })

  const createMutation = useMutation({
    mutationFn: (body: Parameters<typeof createPriceList>[0]) => createPriceList(body),
    onSuccess: () => {
      toast.success('Price list saved')
      onSaved()
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof updatePriceList>[1]) =>
      updatePriceList(priceList!.id, body),
    onSuccess: () => {
      toast.success('Price list saved')
      onSaved()
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  function onSubmit(values: FormValues) {
    const { name, description, startDate, endDate } = values
    if (isEdit) {
      updateMutation.mutate({
        name,
        description: description || null,
        startDate: startDate || null,
        endDate: endDate || null,
      })
    } else {
      createMutation.mutate({
        name,
        description: description || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
    }
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2 className="drawer-title">{isEdit ? 'Edit price list' : 'New price list'}</h2>
          <button className="drawer-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form className="drawer-body" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="modal-label">Name *</label>
            <input className="modal-input" {...register('name')} />
            {errors.name && <p className="drawer-field-error">{errors.name.message}</p>}
          </div>

          <div>
            <label className="modal-label">Description</label>
            <textarea className="modal-input drawer-textarea" {...register('description')} />
          </div>

          <div>
            <label className="modal-label">Start date</label>
            <input type="date" className="modal-input" {...register('startDate')} />
          </div>

          <div>
            <label className="modal-label">End date</label>
            <input type="date" className="modal-input" {...register('endDate')} />
            {errors.endDate && <p className="drawer-field-error">{errors.endDate.message}</p>}
          </div>

          <div className="drawer-footer">
            <button type="button" className="exact-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="exact-btn exact-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
