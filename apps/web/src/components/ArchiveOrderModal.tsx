import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { archiveOrder, type Order } from '../api/orders'
import { getApiError } from '../utils/format'

export function ArchiveOrderModal({
  order,
  onClose,
  onSaved,
}: {
  order: Order
  onClose: () => void
  onSaved: () => void
}) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => archiveOrder(order.id, reason),
    onSuccess: () => {
      toast.success('Order archived')
      queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['recent-orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders-count'] })
      onSaved()
    },
    onError: (err) => {
      toast.error(getApiError(err))
    },
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Archive Order</div>
        <p className="modal-msg">
          Archive order <strong>{order.orderNumber}</strong>? Provide a reason below.
        </p>
        <div className="modal-field">
          <label className="modal-label">Reason</label>
          <p className="modal-warning">This action cannot be undone.</p>
          <textarea
            className="modal-input"
            rows={3}
            placeholder="Archive reason…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onClose} disabled={isPending}>
            Cancel
          </button>
          <button
            className="modal-btn-confirm"
            onClick={() => mutate()}
            disabled={!reason.trim() || isPending}
          >
            {isPending ? 'Archiving…' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  )
}
