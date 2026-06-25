import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import {
  getCustomer,
  archiveCustomer,
  updateCustomerStatus,
  deleteCustomer,
  createContact,
  updateContact,
  deleteContact,
  setPrimaryContact,
  createAddress,
  updateAddress,
  deleteAddress,
  setPrimaryAddress,
  type CustomerDetail,
  type Contact,
  type Address,
} from '../api/customers'
import { getUsers, adminUpdateUser } from '../api/admin'
import { formatDate, getApiError } from '../utils/format'
import { ConfirmModal } from '../components/ConfirmModal'
import { CustomerDrawer } from '../components/CustomerDrawer'

// ── Schemas ───────────────────────────────────────────────────────────────────

const contactSchema = z.object({
  firstName: z.string().min(1, 'First name required').max(100),
  lastName: z.string().min(1, 'Last name required').max(100),
  email: z
    .string()
    .max(255)
    .nullable()
    .optional()
    .or(z.literal('')),
  phoneNumber: z.string().max(50).nullable().optional(),
})

type ContactValues = z.infer<typeof contactSchema>

const addressSchema = z.object({
  street: z.string().min(1, 'Street required').max(255),
  houseNumber: z.string().min(1, 'House number required').max(50),
  postalCode: z.string().min(1, 'Postal code required').max(20),
  city: z.string().min(1, 'City required').max(100),
  province: z.string().max(100).nullable().optional(),
  country: z.string().min(1, 'Country required'),
})

type AddressValues = z.infer<typeof addressSchema>

// ── Helper components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') return <span className="cust-status-badge cust-status-active">Active</span>
  if (status === 'inactive') return <span className="cust-status-badge cust-status-inactive">Inactive</span>
  return <span className="cust-status-badge cust-status-archived">Archived</span>
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null
  return (
    <div className="cust-detail-field">
      <span className="modal-label">{label}</span>
      <span className="cust-detail-value">{value}</span>
    </div>
  )
}

function SectionCard({
  title,
  children,
  action,
}: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="dash-card">
      <div className="cust-section-header">
        <div className="dash-card-title">{title}</div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ── Contact sub-form ──────────────────────────────────────────────────────────

function ContactForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  defaultValues?: ContactValues
  onSubmit: (v: ContactValues) => void
  onCancel: () => void
  submitLabel: string
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: defaultValues ?? { firstName: '', lastName: '', email: '', phoneNumber: '' },
  })

  return (
    <div className="cust-sub-form">
      <div className="cust-form-grid-2">
        <div>
          <label className="modal-label">First name *</label>
          <input className="modal-input" {...register('firstName')} />
          {errors.firstName && <p className="drawer-field-error">{errors.firstName.message}</p>}
        </div>
        <div>
          <label className="modal-label">Last name *</label>
          <input className="modal-input" {...register('lastName')} />
          {errors.lastName && <p className="drawer-field-error">{errors.lastName.message}</p>}
        </div>
      </div>
      <div className="cust-form-grid-2">
        <div>
          <label className="modal-label">Email</label>
          <input className="modal-input" type="email" {...register('email')} />
          {errors.email && <p className="drawer-field-error">{errors.email.message}</p>}
        </div>
        <div>
          <label className="modal-label">Phone</label>
          <input className="modal-input" {...register('phoneNumber')} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button type="button" className="users-action-btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="exact-btn exact-btn-primary" onClick={handleSubmit(onSubmit)}>
          {submitLabel}
        </button>
      </div>
    </div>
  )
}

// ── Address sub-form ──────────────────────────────────────────────────────────

function AddressForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  defaultValues?: AddressValues
  onSubmit: (v: AddressValues) => void
  onCancel: () => void
  submitLabel: string
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: defaultValues ?? {
      street: '',
      houseNumber: '',
      postalCode: '',
      city: '',
      province: '',
      country: '',
    },
  })

  return (
    <div className="cust-sub-form">
      <div className="cust-form-grid-2">
        <div>
          <label className="modal-label">Street *</label>
          <input className="modal-input" {...register('street')} />
          {errors.street && <p className="drawer-field-error">{errors.street.message}</p>}
        </div>
        <div>
          <label className="modal-label">House number *</label>
          <input className="modal-input" {...register('houseNumber')} />
          {errors.houseNumber && <p className="drawer-field-error">{errors.houseNumber.message}</p>}
        </div>
      </div>
      <div className="cust-form-grid-2">
        <div>
          <label className="modal-label">Postal code *</label>
          <input className="modal-input" {...register('postalCode')} />
          {errors.postalCode && <p className="drawer-field-error">{errors.postalCode.message}</p>}
        </div>
        <div>
          <label className="modal-label">City *</label>
          <input className="modal-input" {...register('city')} />
          {errors.city && <p className="drawer-field-error">{errors.city.message}</p>}
        </div>
      </div>
      <div className="cust-form-grid-2">
        <div>
          <label className="modal-label">Province</label>
          <input className="modal-input" {...register('province')} />
        </div>
        <div>
          <label className="modal-label">Country *</label>
          <input className="modal-input" {...register('country')} />
          {errors.country && <p className="drawer-field-error">{errors.country.message}</p>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button type="button" className="users-action-btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="exact-btn exact-btn-primary" onClick={handleSubmit(onSubmit)}>
          {submitLabel}
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CustomerDetailPage() {
  const { id } = useParams({ from: '/app/customers/$id' })
  const customerId = parseInt(id, 10)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'

  const [archiveOpen, setArchiveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [showMemberPicker, setShowMemberPicker] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')

  // Contact state
  const [showContactForm, setShowContactForm] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [removingContact, setRemovingContact] = useState<Contact | null>(null)

  // Address state
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [removingAddress, setRemovingAddress] = useState<Address | null>(null)

  const { data: customer, isLoading, isError } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomer(customerId).then((r) => r.data),
  })

  // ── Status / delete mutations ─────────────────────────────────────────────

  const statusMutation = useMutation({
    mutationFn: (s: 'active' | 'inactive') => updateCustomerStatus(customerId, s),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Status updated')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCustomer(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer deleted')
      navigate({ to: '/customers' })
    },
    onError: (err) => {
      const status = (err as any)?.response?.status
      toast.error(status === 501 ? 'Delete is not yet available' : getApiError(err))
      setDeleteOpen(false)
    },
  })

  // ── Archive mutation ──────────────────────────────────────────────────────

  const archiveMutation = useMutation({
    mutationFn: () => archiveCustomer(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setArchiveOpen(false)
      toast.success('Customer archived')
    },
    onError: (err) => {
      const status = (err as any)?.response?.status
      if (status === 501) {
        toast.error('Archive is not yet available')
      } else {
        toast.error(getApiError(err))
      }
      setArchiveOpen(false)
    },
  })

  // ── Member mutations ──────────────────────────────────────────────────────

  const { data: allUsersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users-for-customer-picker'],
    queryFn: () => getUsers(1, 100).then((r) => r.data),
    enabled: showMemberPicker,
  })

  const addMemberMutation = useMutation({
    mutationFn: (userId: number) => adminUpdateUser(userId, { customerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      setShowMemberPicker(false)
      setMemberSearch('')
      toast.success('User added to customer')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => adminUpdateUser(userId, { customerId: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      toast.success('User removed from customer')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  // ── Contact mutations ─────────────────────────────────────────────────────

  const createContactMutation = useMutation({
    mutationFn: (body: ContactValues) =>
      createContact(customerId, {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email || null,
        phoneNumber: body.phoneNumber || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      setShowContactForm(false)
      toast.success('Contact added')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const updateContactMutation = useMutation({
    mutationFn: ({ contactId, body }: { contactId: number; body: ContactValues }) =>
      updateContact(customerId, contactId, {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email || null,
        phoneNumber: body.phoneNumber || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      setEditingContact(null)
      toast.success('Contact updated')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const deleteContactMutation = useMutation({
    mutationFn: (contactId: number) => deleteContact(customerId, contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      setRemovingContact(null)
      toast.success('Contact removed')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const setPrimaryContactMutation = useMutation({
    mutationFn: (contactId: number) => setPrimaryContact(customerId, contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  // ── Address mutations ─────────────────────────────────────────────────────

  const createAddressMutation = useMutation({
    mutationFn: (body: AddressValues) =>
      createAddress(customerId, {
        street: body.street,
        houseNumber: body.houseNumber,
        postalCode: body.postalCode,
        city: body.city,
        province: body.province || null,
        country: body.country,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      setShowAddressForm(false)
      toast.success('Address added')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const updateAddressMutation = useMutation({
    mutationFn: ({ addressId, body }: { addressId: number; body: AddressValues }) =>
      updateAddress(customerId, addressId, {
        street: body.street,
        houseNumber: body.houseNumber,
        postalCode: body.postalCode,
        city: body.city,
        province: body.province || null,
        country: body.country,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      setEditingAddress(null)
      toast.success('Address updated')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const deleteAddressMutation = useMutation({
    mutationFn: (addressId: number) => deleteAddress(customerId, addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      setRemovingAddress(null)
      toast.success('Address removed')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const setPrimaryAddressMutation = useMutation({
    mutationFn: (addressId: number) => setPrimaryAddress(customerId, addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  // ── Loading / error ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="profile-loading">
        <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
      </div>
    )
  }

  if (isError || !customer) {
    return (
      <div className="profile-loading">
        <p style={{ color: '#f87171' }}>Failed to load customer.</p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const atContactMax = customer.contacts.length >= 10

  return (
    <div className="cust-detail-page">
      <div>
        <button className="cust-back-btn" onClick={() => navigate({ to: '/customers' })}>
          ← Back
        </button>
      </div>

      {/* Header card */}
      <div className="dash-card cust-detail-header">
        <div className="cust-detail-header-left">
          <div>
            <div className="cust-detail-number">#{customer.customerNumber}</div>
            <h1 className="cust-detail-name">{customer.name}</h1>
            {customer.companyName && <div className="cust-detail-company">{customer.companyName}</div>}
          </div>
          <StatusBadge status={customer.status} />
        </div>
        {isAdmin && (
          <div className="cust-detail-header-actions">
            <button className="exact-btn exact-btn-secondary" onClick={() => setEditOpen(true)}>Edit</button>
            {customer.status === 'active' && (
              <button
                className="exact-btn exact-btn-secondary"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate('inactive')}
              >
                Deactivate
              </button>
            )}
            {customer.status === 'inactive' && (
              <button
                className="exact-btn exact-btn-secondary"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate('active')}
              >
                Activate
              </button>
            )}
            {customer.status !== 'archived' && (
              <button className="exact-btn exact-btn-danger-outline" onClick={() => setArchiveOpen(true)}>Archive</button>
            )}
            <button className="exact-btn exact-btn-danger-outline" onClick={() => setDeleteOpen(true)}>Delete</button>
          </div>
        )}
      </div>

      {/* Two-column grid */}
      <div className="cust-detail-grid">
        <SectionCard title="General information">
          <Field label="Email" value={customer.email} />
          <Field label="Phone" value={customer.phoneNumber} />
          <Field label="Company" value={customer.companyName} />
          <Field label="Country" value={customer.country} />
          <Field label="VAT number" value={customer.vatNumber} />
          <Field label="End date" value={customer.endDate ? formatDate(customer.endDate) : null} />
          <Field label="Created" value={formatDate(customer.createdAt)} />
          <Field label="Updated" value={formatDate(customer.updatedAt)} />
          <Field label="Created by" value={customer.createdBy} />
          <Field label="Updated by" value={customer.updatedBy} />
        </SectionCard>

        <SectionCard title="Overview">
          <Field label="Orders" value={String(customer.orderCount)} />
          <Field label="Contacts" value={String(customer.contacts.length)} />
          <Field label="Addresses" value={String(customer.addresses.length)} />
        </SectionCard>
      </div>

      {/* Contacts section */}
      <SectionCard title="Contacts">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Primary</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {customer.contacts.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} style={{ color: '#6b6e87', fontSize: '0.8rem', padding: '0.75rem 0' }}>
                  No contacts yet.
                </td>
              </tr>
            )}
            {customer.contacts.map((c) => {
              const isEditingThis = editingContact?.id === c.id
              return (
                <>
                  <tr key={c.id}>
                    <td>{c.firstName} {c.lastName}</td>
                    <td>{c.email ?? <span className="users-td-muted">—</span>}</td>
                    <td>{c.phoneNumber ?? <span className="users-td-muted">—</span>}</td>
                    <td>
                      {c.isPrimary && <span className="cust-primary-badge">Primary</span>}
                    </td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            className="cust-sub-btn"
                            onClick={() => {
                              setEditingContact(isEditingThis ? null : c)
                              setShowContactForm(false)
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="cust-sub-btn cust-sub-btn-danger"
                            onClick={() => setRemovingContact(c)}
                          >
                            Remove
                          </button>
                          <button
                            className="cust-sub-btn"
                            disabled={c.isPrimary}
                            title={c.isPrimary ? 'Already primary' : undefined}
                            onClick={() => setPrimaryContactMutation.mutate(c.id)}
                          >
                            Set Primary
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                  {isEditingThis && (
                    <tr key={`edit-${c.id}`}>
                      <td colSpan={isAdmin ? 5 : 4}>
                        <ContactForm
                          defaultValues={{
                            firstName: c.firstName,
                            lastName: c.lastName,
                            email: c.email ?? '',
                            phoneNumber: c.phoneNumber ?? '',
                          }}
                          onSubmit={(v) => updateContactMutation.mutate({ contactId: c.id, body: v })}
                          onCancel={() => setEditingContact(null)}
                          submitLabel="Save"
                        />
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>

        {isAdmin && showContactForm && (
          <ContactForm
            onSubmit={(v) => createContactMutation.mutate(v)}
            onCancel={() => setShowContactForm(false)}
            submitLabel="Add"
          />
        )}

        {isAdmin && !showContactForm && !editingContact && (
          <button
            className="cust-add-btn"
            style={{ marginTop: '0.75rem' }}
            onClick={() => setShowContactForm(true)}
            disabled={atContactMax}
            title={atContactMax ? 'Maximum 10 contacts reached' : undefined}
          >
            {atContactMax ? 'Maximum 10 contacts reached' : '+ Add contact'}
          </button>
        )}
      </SectionCard>

      {/* Addresses section */}
      <SectionCard title="Addresses">
        <div className="cust-addr-grid">
          {customer.addresses.map((a) => {
            const isEditingThis = editingAddress?.id === a.id
            const canRemove = customer.addresses.length > 1
            return (
              <div key={a.id}>
                <div className={`cust-addr-card${a.isPrimary ? ' cust-addr-card--primary' : ''}`}>
                  {a.isPrimary && <span className="cust-primary-badge" style={{ marginBottom: '0.375rem', display: 'inline-block' }}>Primary</span>}
                  <div className="cust-addr-line">{a.street} {a.houseNumber}</div>
                  <div className="cust-addr-line">{a.postalCode} {a.city}</div>
                  {a.province && <div className="cust-addr-line">{a.province}</div>}
                  <div className="cust-addr-country">{a.country}</div>
                  {isAdmin && (
                    <div className="cust-addr-actions">
                      <button
                        className="cust-sub-btn"
                        onClick={() => {
                          setEditingAddress(isEditingThis ? null : a)
                          setShowAddressForm(false)
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="cust-sub-btn cust-sub-btn-danger"
                        disabled={!canRemove}
                        title={!canRemove ? 'Cannot remove the only address' : undefined}
                        onClick={() => setRemovingAddress(a)}
                      >
                        Remove
                      </button>
                      {!a.isPrimary && (
                        <button
                          className="cust-sub-btn"
                          onClick={() => setPrimaryAddressMutation.mutate(a.id)}
                        >
                          Set Primary
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {isEditingThis && (
                  <AddressForm
                    defaultValues={{
                      street: a.street,
                      houseNumber: a.houseNumber,
                      postalCode: a.postalCode,
                      city: a.city,
                      province: a.province ?? '',
                      country: a.country,
                    }}
                    onSubmit={(v) => updateAddressMutation.mutate({ addressId: a.id, body: v })}
                    onCancel={() => setEditingAddress(null)}
                    submitLabel="Save"
                  />
                )}
              </div>
            )
          })}
        </div>

        {isAdmin && showAddressForm && (
          <AddressForm
            onSubmit={(v) => createAddressMutation.mutate(v)}
            onCancel={() => setShowAddressForm(false)}
            submitLabel="Add"
          />
        )}

        {isAdmin && !showAddressForm && !editingAddress && (
          <button
            className="cust-add-btn"
            style={{ marginTop: '0.75rem' }}
            onClick={() => setShowAddressForm(true)}
          >
            + Add address
          </button>
        )}
      </SectionCard>

      {/* Members section */}
      <SectionCard
        title="Members"
        action={
          isAdmin ? (
            <button
              className="cust-add-btn"
              style={{ width: 'auto', padding: '0.3rem 0.85rem' }}
              onClick={() => setShowMemberPicker((v) => !v)}
            >
              + Add user
            </button>
          ) : undefined
        }
      >
        {isAdmin && showMemberPicker && (
          <div className="cust-sub-form" style={{ marginBottom: '0.75rem' }}>
            <input
              className="cust-filter-input"
              style={{ width: '100%', marginBottom: '0.5rem' }}
              placeholder="Search users…"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              autoFocus
            />
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {(() => {
                const memberIds = new Set(customer.members.map((m) => m.id))
                const filtered = (allUsersData?.data ?? []).filter(
                  (u) =>
                    !memberIds.has(u.id) &&
                    (memberSearch === '' ||
                      u.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
                      [u.firstName, u.lastName].filter(Boolean).join(' ').toLowerCase().includes(memberSearch.toLowerCase())),
                )
                if (usersLoading) return <p style={{ color: '#6b6e87', fontSize: '0.8rem' }}>Loading…</p>
                if (filtered.length === 0) return <p style={{ color: '#6b6e87', fontSize: '0.8rem' }}>No users found</p>
                return filtered.map((u) => (
                  <button
                    key={u.id}
                    className="cust-sub-btn"
                    style={{ textAlign: 'left', padding: '0.4rem 0.6rem' }}
                    disabled={addMemberMutation.isPending}
                    onClick={() => addMemberMutation.mutate(u.id)}
                  >
                    <span style={{ color: '#e0e2f0' }}>{u.email}</span>
                    {(u.firstName || u.lastName) && (
                      <span style={{ color: '#6b6e87', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                        {[u.firstName, u.lastName].filter(Boolean).join(' ')}
                      </span>
                    )}
                  </button>
                ))
              })()}
            </div>
            <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
              <button className="users-action-btn" onClick={() => { setShowMemberPicker(false); setMemberSearch('') }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {customer.members.length === 0 ? (
          <p style={{ color: '#6b6e87', fontSize: '0.825rem' }}>No users assigned to this customer.</p>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                {isAdmin && <th />}
              </tr>
            </thead>
            <tbody>
              {customer.members.map((m) => (
                <tr key={m.id}>
                  <td>{m.email}</td>
                  <td className="users-td-muted">
                    {[m.firstName, m.lastName].filter(Boolean).join(' ') || '—'}
                  </td>
                  {isAdmin && (
                    <td>
                      <button
                        className="cust-sub-btn cust-sub-btn-danger"
                        disabled={removeMemberMutation.isPending}
                        onClick={() => removeMemberMutation.mutate(m.id)}
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* Orders section */}
      <SectionCard title="Orders">
        <div className="shell-empty-state">
          <p className="shell-empty-title">No orders yet</p>
          <p className="shell-empty-hint">Order management coming soon.</p>
        </div>
      </SectionCard>

      {/* Delete confirm */}
      {deleteOpen && (
        <ConfirmModal
          title="Delete customer"
          message={`Permanently delete ${customer.name}? This action cannot be undone.`}
          confirmLabel="Delete"
          danger
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setDeleteOpen(false)}
        />
      )}

      {/* Archive confirm */}
      {archiveOpen && (
        <ConfirmModal
          title="Archive customer"
          message={`Archive ${customer.name}? Archived customers will no longer appear in active lists.`}
          confirmLabel="Archive"
          loading={archiveMutation.isPending}
          onConfirm={() => archiveMutation.mutate()}
          onCancel={() => setArchiveOpen(false)}
        />
      )}

      {/* Remove contact confirm */}
      {removingContact && (
        <ConfirmModal
          title="Remove contact"
          message={`Remove ${removingContact.firstName} ${removingContact.lastName}?`}
          confirmLabel="Remove"
          loading={deleteContactMutation.isPending}
          onConfirm={() => deleteContactMutation.mutate(removingContact.id)}
          onCancel={() => setRemovingContact(null)}
        />
      )}

      {/* Remove address confirm */}
      {removingAddress && (
        <ConfirmModal
          title="Remove address"
          message={`Remove ${removingAddress.street} ${removingAddress.houseNumber}, ${removingAddress.city}?`}
          confirmLabel="Remove"
          loading={deleteAddressMutation.isPending}
          onConfirm={() => deleteAddressMutation.mutate(removingAddress.id)}
          onCancel={() => setRemovingAddress(null)}
        />
      )}

      {/* Edit drawer */}
      {editOpen && (
        <CustomerDrawer
          customer={customer}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
            queryClient.invalidateQueries({ queryKey: ['customers'] })
            setEditOpen(false)
          }}
        />
      )}
    </div>
  )
}
