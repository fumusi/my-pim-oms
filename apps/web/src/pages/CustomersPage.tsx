import { useState, useEffect } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import type { AxiosError } from 'axios'
import {
  getCustomers,
  updateCustomerStatus,
  deleteCustomer,
  archiveCustomer,
  type Customer,
  type CustomerStatus,
} from '../api/customers'
import { ConfirmModal } from '../components/ConfirmModal'
import { CustomerDrawer } from '../components/CustomerDrawer'
import { formatDate, getApiError } from '../utils/format'

type ConfirmAction =
  | { type: 'delete'; customer: Customer }
  | { type: 'archive'; customer: Customer }

function StatusBadge({ status }: { status: CustomerStatus }) {
  if (status === 'active') return <span className="cust-status-badge cust-status-active">Active</span>
  if (status === 'inactive') return <span className="cust-status-badge cust-status-inactive">Inactive</span>
  return <span className="cust-status-badge cust-status-archived">Archived</span>
}

export function CustomersPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'

  const { page, search, status, country } = useSearch({ from: '/app/customers' })
  const limit = 20

  const [searchInput, setSearchInput] = useState(search ?? '')

  const [drawerCustomer, setDrawerCustomer] = useState<Customer | null | undefined>(undefined)
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      navigate({
        to: '/customers',
        search: (prev) => ({ ...prev, search: searchInput || undefined, page: 1 }),
      })
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customers', page, limit, search, status, country],
    queryFn: () =>
      getCustomers({ page, limit, search: search || undefined, status, country }).then((r) => r.data),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, s }: { id: number; s: CustomerStatus }) => updateCustomerStatus(id, s),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Status updated')
    },
    onError: (err) => {
      toast.error(getApiError(err))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setConfirm(null)
      toast.success('Customer deleted')
    },
    onError: (err) => {
      if ((err as AxiosError)?.response?.status === 501) {
        toast.error('Delete is not yet available')
      } else {
        toast.error(getApiError(err))
      }
      setConfirm(null)
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (id: number) => archiveCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setConfirm(null)
      toast.success('Customer archived')
    },
    onError: (err) => {
      if ((err as AxiosError)?.response?.status === 501) {
        toast.error('Archive is not yet available')
      } else {
        toast.error(getApiError(err))
      }
      setConfirm(null)
    },
  })

  function setFilter(updates: Partial<{ status: CustomerStatus | undefined; country: string | undefined }>) {
    navigate({
      to: '/customers',
      search: (prev) => ({ ...prev, ...updates, page: 1 }),
    })
  }

  function setPage(p: number) {
    navigate({ to: '/customers', search: (prev) => ({ ...prev, page: p }) })
  }

  function handleConfirm() {
    if (!confirm) return
    if (confirm.type === 'delete') deleteMutation.mutate(confirm.customer.id)
    if (confirm.type === 'archive') archiveMutation.mutate(confirm.customer.id)
  }

  const customers = data?.data ?? []
  const totalPages = data ? Math.ceil(data.total / limit) : 0
  const mutationLoading = deleteMutation.isPending || archiveMutation.isPending

  const confirmTitle = confirm?.type === 'delete' ? 'Delete customer' : 'Archive customer'
  const confirmMessage =
    confirm?.type === 'delete'
      ? 'This will permanently delete the customer and all their data. This action cannot be undone.'
      : 'Archived customers will no longer appear in active lists.'

  return (
    <>
      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <div className="dash-card-title">Customers</div>
            <div className="dash-card-sub">
              {data ? `${data.total} customer${data.total === 1 ? '' : 's'}` : 'Loading…'}
            </div>
          </div>
          {isAdmin && (
            <button
              className="exact-btn exact-btn-primary"
              onClick={() => setDrawerCustomer(null)}
            >
              + New customer
            </button>
          )}
        </div>

        <div className="cust-filters">
          <input
            className="cust-filter-input"
            type="text"
            placeholder="Search customers…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <select
            className="cust-filter-select"
            value={status ?? ''}
            onChange={(e) =>
              setFilter({ status: (e.target.value || undefined) as CustomerStatus | undefined })
            }
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
          <input
            className="cust-filter-input"
            type="text"
            placeholder="Country"
            value={country ?? ''}
            onChange={(e) => setFilter({ country: e.target.value || undefined })}
          />
        </div>

        {isLoading && !data && (
          <div className="profile-loading">
            <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
          </div>
        )}

        {isError && (
          <div className="profile-loading">
            <p style={{ color: '#f87171' }}>Failed to load customers.</p>
          </div>
        )}

        {!isLoading && !isError && customers.length === 0 && (
          <div className="profile-loading">
            <p style={{ color: '#6b6e87' }}>No customers found</p>
          </div>
        )}

        {!isError && customers.length > 0 && (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name / Company</th>
                  <th>Email</th>
                  <th>Country</th>
                  <th>Status</th>
                  <th>Orders</th>
                  <th>Created</th>
                  {isAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="users-td-muted" style={{ fontSize: '0.78rem' }}>
                      {c.customerNumber}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#e0e2f0' }}>{c.name}</div>
                      {c.companyName && (
                        <div style={{ fontSize: '0.75rem', color: '#6b6e87', marginTop: 2 }}>
                          {c.companyName}
                        </div>
                      )}
                    </td>
                    <td className="users-td-muted">{c.email}</td>
                    <td className="users-td-muted">{c.country}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="users-td-muted">—</td>
                    <td className="users-td-muted">{formatDate(c.createdAt)}</td>
                    {isAdmin && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          <button
                            className="users-action-btn"
                            onClick={() => setDrawerCustomer(c)}
                          >
                            Edit
                          </button>
                          {c.status === 'active' && (
                            <button
                              className="users-action-btn"
                              disabled={statusMutation.isPending}
                              onClick={() => statusMutation.mutate({ id: c.id, s: 'inactive' })}
                            >
                              Deactivate
                            </button>
                          )}
                          {c.status === 'inactive' && (
                            <button
                              className="users-action-btn"
                              disabled={statusMutation.isPending}
                              onClick={() => statusMutation.mutate({ id: c.id, s: 'active' })}
                            >
                              Activate
                            </button>
                          )}
                          {c.status !== 'archived' && (
                            <button
                              className="users-action-btn"
                              onClick={() => setConfirm({ type: 'archive', customer: c })}
                            >
                              Archive
                            </button>
                          )}
                          <button
                            className="users-action-btn users-action-btn-danger"
                            onClick={() => setConfirm({ type: 'delete', customer: c })}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && totalPages > 1 && (
          <div className="users-pagination">
            <span className="users-pagination-info">
              Page {data.page} of {totalPages} · {data.total} total
            </span>
            <div className="users-pagination-btns">
              <button
                className="users-pg-btn"
                disabled={data.page <= 1}
                onClick={() => setPage(data.page - 1)}
              >
                ‹ Prev
              </button>
              <button
                className="users-pg-btn"
                disabled={data.page >= totalPages}
                onClick={() => setPage(data.page + 1)}
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>

      {drawerCustomer !== undefined && (
        <CustomerDrawer
          customer={drawerCustomer}
          onClose={() => setDrawerCustomer(undefined)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['customers'] })
            setDrawerCustomer(undefined)
          }}
        />
      )}

      {confirm && (
        <ConfirmModal
          title={confirmTitle}
          message={confirmMessage}
          confirmLabel={confirm.type === 'delete' ? 'Delete' : 'Archive'}
          danger={confirm.type === 'delete'}
          loading={mutationLoading}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}
