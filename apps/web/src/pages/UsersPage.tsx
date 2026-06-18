import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getUsers, adminUpdateUser, adminDeleteUser, type AdminUser } from '../api/admin'
import { RoleBadge } from '../components/RoleBadge'
import { ConfirmModal } from '../components/ConfirmModal'
import { EditUserModal } from '../components/EditUserModal'

const PAGE_SIZE = 20

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)

  const { data: result, isLoading, isError } = useQuery({
    queryKey: ['users', page],
    queryFn: () => getUsers(page, PAGE_SIZE).then((r) => r.data),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { email: string; role: string; isActive: boolean } }) =>
      adminUpdateUser(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditTarget(null)
      toast.success('User updated')
    },
    onError: () => toast.error('Failed to update user'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminDeleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteTarget(null)
      toast.success('User deactivated')
    },
    onError: () => toast.error('Failed to delete user'),
  })

  const users = result?.data ?? []
  const meta = result?.meta

  if (isLoading) {
    return (
      <div className="profile-loading">
        <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="profile-loading">
        <p style={{ color: '#f87171' }}>Failed to load users.</p>
      </div>
    )
  }

  return (
    <>
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
                    <th>Role</th>
                    <th>Status</th>
                    <th>Member since</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id}>
                      <td className="users-td-muted">{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td>
                        <div>{u.email}</div>
                        {(u.firstName || u.lastName) && (
                          <div className="users-td-muted" style={{ fontSize: '0.75rem', marginTop: 1 }}>
                            {[u.firstName, u.lastName].filter(Boolean).join(' ')}
                          </div>
                        )}
                      </td>
                      <td>
                        <RoleBadge role={u.role} />
                      </td>
                      <td>
                        <span className={`users-status-pill${u.isActive ? ' users-status-active' : ' users-status-inactive'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="users-td-muted">{formatDate(u.createdAt)}</td>
                      <td>
                        <div className="users-actions">
                          <button
                            className="users-action-btn"
                            onClick={() => setEditTarget(u)}
                            title="Edit user"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            className="users-action-btn users-action-btn-danger"
                            onClick={() => setDeleteTarget(u)}
                            title="Delete user"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
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

      {editTarget && (
        <EditUserModal
          user={editTarget}
          loading={editMutation.isPending}
          onSave={(data) => editMutation.mutate({ id: editTarget.id, body: data })}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Deactivate user"
          message={`Deactivate ${deleteTarget.email}? They will no longer be able to log in.`}
          confirmLabel="Deactivate"
          danger
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}
