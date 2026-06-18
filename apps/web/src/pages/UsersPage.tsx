import { useEffect, useState } from 'react'
import { getUsers, type AdminUser, type PaginatedUsers } from '../api/admin'
import { RoleBadge } from '../components/RoleBadge'

const PAGE_SIZE = 20

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function UsersPage() {
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<PaginatedUsers | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getUsers(page, PAGE_SIZE)
      .then((res) => setResult(res.data))
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false))
  }, [page])

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="profile-loading">
        <p style={{ color: '#f87171' }}>{error}</p>
      </div>
    )
  }

  const users: AdminUser[] = result?.data ?? []
  const meta = result?.meta

  return (
    <div>
      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <div className="dash-card-title">All Users</div>
            <div className="dash-card-sub">
              {meta ? `${meta.total} user${meta.total === 1 ? '' : 's'} total` : ''}
            </div>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="shell-empty-state" style={{ padding: '3rem 1rem' }}>
            <p className="shell-empty-title">No users yet</p>
          </div>
        ) : (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Member since</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id}>
                    <td className="users-td-muted">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>{u.email}</td>
                    <td className="users-td-muted">
                      {u.firstName || u.lastName
                        ? [u.firstName, u.lastName].filter(Boolean).join(' ')
                        : '—'}
                    </td>
                    <td>
                      <RoleBadge role={u.role} />
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: u.isActive ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                          color: u.isActive ? '#34d399' : '#f87171',
                        }}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="users-td-muted">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="users-pagination">
          <span className="users-pagination-info">
            {meta ? `Page ${meta.page} of ${meta.totalPages}` : ''}
          </span>
          <div className="users-pagination-btns">
            <button
              className="users-pg-btn"
              disabled={!meta || meta.page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              className="users-pg-btn"
              disabled={!meta || meta.page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
