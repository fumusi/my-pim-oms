import { useState } from 'react'
import type { AdminUser } from '../api/admin'

interface Props {
  user: AdminUser
  loading?: boolean
  onSave: (data: { email: string; role: string; isActive: boolean }) => void
  onCancel: () => void
}

export function EditUserModal({ user, loading = false, onSave, onCancel }: Props) {
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState(user.role)
  const [isActive, setIsActive] = useState(user.isActive)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({ email, role, isActive })
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
