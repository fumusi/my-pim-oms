import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { AdminUser } from '../api/admin'
import { getCustomers } from '../api/customers'

interface Props {
  user: AdminUser
  loading?: boolean
  onSave: (data: { email: string; role: string; isActive: boolean; customerId: number | null }) => void
  onCancel: () => void
}

export function EditUserModal({ user, loading = false, onSave, onCancel }: Props) {
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState(user.role)
  const [isActive, setIsActive] = useState(user.isActive)
  const [customerId, setCustomerId] = useState<number | null>(user.customerId ?? null)

  const { data: customersData } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => getCustomers({ limit: 100 }).then(r => r.data),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({ email, role, isActive, customerId })
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Edit user</h3>

        <form onSubmit={handleSubmit}>
          <div className="modal-field">
            <label className="modal-label" htmlFor="eu-email">Email</label>
            <input
              id="eu-email"
              className="modal-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="eu-role">Role</label>
            <select
              id="eu-role"
              className="modal-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="eu-customer">Customer</label>
            <select
              id="eu-customer"
              className="modal-select"
              value={customerId ?? ''}
              onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— No customer —</option>
              {customersData?.data.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.customerNumber})</option>
              ))}
            </select>
          </div>

          <div className="modal-field modal-field-check">
            <label className="modal-label" htmlFor="eu-active">Active</label>
            <input
              id="eu-active"
              type="checkbox"
              className="modal-checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="modal-btn-cancel" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="modal-btn-confirm" disabled={loading}>
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
