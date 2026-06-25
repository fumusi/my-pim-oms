import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getCustomer,
  createCustomer,
  updateCustomer,
  createContact,
  updateContact,
  deleteContact,
  setPrimaryContact,
  createAddress,
  updateAddress,
  deleteAddress,
  setPrimaryAddress,
  type Customer,
  type CustomerDetail,
  type Contact,
  type Address,
  type CreateContactBody,
  type CreateAddressBody,
} from '../api/customers'
import { getApiError } from '../utils/format'

interface Props {
  customer?: Customer | null
  onClose: () => void
  onSaved: () => void
}

type Tab = 'general' | 'contacts' | 'addresses'

const generalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  companyName: z.string().max(255).nullable().optional(),
  email: z.string().email('Invalid email').max(255),
  phoneNumber: z.string().max(50).nullable().optional(),
  country: z.string().min(1, 'Country is required'),
  vatNumber: z.string().max(50).nullable().optional(),
  status: z.enum(['active', 'inactive']),
  endDate: z.string().nullable().optional(),
})

type GeneralValues = z.infer<typeof generalSchema>

const contactSchema = z.object({
  firstName: z.string().min(1, 'First name required').max(100),
  lastName: z.string().min(1, 'Last name required').max(100),
  email: z.union([z.string().email('Invalid email').max(255), z.literal('')]).optional(),
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

interface LocalContact {
  _tempId: string
  firstName: string
  lastName: string
  email: string | null
  phoneNumber: string | null
  isPrimary: boolean
}

interface LocalAddress {
  _tempId: string
  street: string
  houseNumber: string
  postalCode: string
  city: string
  province: string | null
  country: string
  isPrimary: boolean
}

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

export function CustomerDrawer({ customer, onClose, onSaved }: Props) {
  const isEditMode = customer != null
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('general')

  const { data: customerDetail } = useQuery({
    queryKey: ['customer', customer?.id],
    queryFn: () => getCustomer(customer!.id).then((r) => r.data),
    enabled: isEditMode,
  })

  const generalForm = useForm<GeneralValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      name: '',
      companyName: '',
      email: '',
      phoneNumber: '',
      country: '',
      vatNumber: '',
      status: 'active',
      endDate: '',
    },
  })

  useEffect(() => {
    if (customerDetail) {
      generalForm.reset({
        name: customerDetail.name,
        companyName: customerDetail.companyName ?? '',
        email: customerDetail.email,
        phoneNumber: customerDetail.phoneNumber ?? '',
        country: customerDetail.country,
        vatNumber: customerDetail.vatNumber ?? '',
        status: customerDetail.status === 'archived' ? 'active' : customerDetail.status,
        endDate: customerDetail.endDate ?? '',
      })
    }
  }, [customerDetail]) // eslint-disable-line react-hooks/exhaustive-deps

  // Create mode: local state for contacts and addresses
  const [localContacts, setLocalContacts] = useState<LocalContact[]>([])
  const [localAddresses, setLocalAddresses] = useState<LocalAddress[]>([])

  // Contact form state
  const [showContactForm, setShowContactForm] = useState(false)
  const [editingContact, setEditingContact] = useState<LocalContact | Contact | null>(null)

  // Address form state
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<LocalAddress | Address | null>(null)

  // Edit mode mutations
  const refetchDetail = () => {
    if (isEditMode) {
      queryClient.invalidateQueries({ queryKey: ['customer', customer!.id] })
    }
  }

  const updateGeneralMutation = useMutation({
    mutationFn: (body: GeneralValues) =>
      updateCustomer(customer!.id, {
        name: body.name,
        companyName: body.companyName || null,
        email: body.email,
        phoneNumber: body.phoneNumber || null,
        country: body.country,
        vatNumber: body.vatNumber || null,
        status: body.status,
        endDate: body.endDate || null,
      }),
    onSuccess: () => {
      toast.success('Customer updated')
      onSaved()
    },
    onError: (err) => {
      toast.error(getApiError(err))
    },
  })

  const createContactMutation = useMutation({
    mutationFn: (body: CreateContactBody) => createContact(customer!.id, body),
    onSuccess: () => {
      refetchDetail()
      setShowContactForm(false)
      toast.success('Contact added')
    },
    onError: (err) => {
      toast.error(getApiError(err))
    },
  })

  const updateContactMutation = useMutation({
    mutationFn: ({ contactId, body }: { contactId: number; body: Partial<CreateContactBody> }) =>
      updateContact(customer!.id, contactId, body),
    onSuccess: () => {
      refetchDetail()
      setEditingContact(null)
      toast.success('Contact updated')
    },
    onError: (err) => {
      toast.error(getApiError(err))
    },
  })

  const deleteContactMutation = useMutation({
    mutationFn: (contactId: number) => deleteContact(customer!.id, contactId),
    onSuccess: () => {
      refetchDetail()
      toast.success('Contact removed')
    },
    onError: (err) => {
      toast.error(getApiError(err))
    },
  })

  const setPrimaryContactMutation = useMutation({
    mutationFn: (contactId: number) => setPrimaryContact(customer!.id, contactId),
    onSuccess: () => {
      refetchDetail()
    },
    onError: (err) => {
      toast.error(getApiError(err))
    },
  })

  const createAddressMutation = useMutation({
    mutationFn: (body: CreateAddressBody) => createAddress(customer!.id, body),
    onSuccess: () => {
      refetchDetail()
      setShowAddressForm(false)
      toast.success('Address added')
    },
    onError: (err) => {
      toast.error(getApiError(err))
    },
  })

  const updateAddressMutation = useMutation({
    mutationFn: ({ addressId, body }: { addressId: number; body: Partial<CreateAddressBody> }) =>
      updateAddress(customer!.id, addressId, body),
    onSuccess: () => {
      refetchDetail()
      setEditingAddress(null)
      toast.success('Address updated')
    },
    onError: (err) => {
      toast.error(getApiError(err))
    },
  })

  const deleteAddressMutation = useMutation({
    mutationFn: (addressId: number) => deleteAddress(customer!.id, addressId),
    onSuccess: () => {
      refetchDetail()
      toast.success('Address removed')
    },
    onError: (err) => {
      toast.error(getApiError(err))
    },
  })

  const setPrimaryAddressMutation = useMutation({
    mutationFn: (addressId: number) => setPrimaryAddress(customer!.id, addressId),
    onSuccess: () => {
      refetchDetail()
    },
    onError: (err) => {
      toast.error(getApiError(err))
    },
  })

  const createCustomerMutation = useMutation({
    mutationFn: (body: Parameters<typeof createCustomer>[0]) => createCustomer(body),
    onSuccess: () => {
      toast.success('Customer created')
      onSaved()
    },
    onError: (err) => {
      toast.error(getApiError(err))
    },
  })

  function handleCreateSubmit() {
    generalForm.handleSubmit((values) => {
      if (localAddresses.length === 0) {
        toast.error('At least one address is required')
        setTab('addresses')
        return
      }
      createCustomerMutation.mutate({
        name: values.name,
        companyName: values.companyName || null,
        email: values.email,
        phoneNumber: values.phoneNumber || null,
        country: values.country,
        vatNumber: values.vatNumber || null,
        status: values.status,
        endDate: values.endDate || null,
        addresses: localAddresses.map((a) => ({
          street: a.street,
          houseNumber: a.houseNumber,
          postalCode: a.postalCode,
          city: a.city,
          province: a.province,
          country: a.country,
          isPrimary: a.isPrimary,
        })),
        contacts: localContacts.map((c) => ({
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phoneNumber: c.phoneNumber,
          isPrimary: c.isPrimary,
        })),
      })
    })()
  }

  // Local contact helpers (create mode)
  function addLocalContact(v: ContactValues) {
    const isPrimary = localContacts.length === 0
    setLocalContacts((prev) => [
      ...prev,
      {
        _tempId: Math.random().toString(36).slice(2),
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email || null,
        phoneNumber: v.phoneNumber || null,
        isPrimary,
      },
    ])
    setShowContactForm(false)
  }

  function updateLocalContact(tempId: string, v: ContactValues) {
    setLocalContacts((prev) =>
      prev.map((c) =>
        c._tempId === tempId
          ? { ...c, firstName: v.firstName, lastName: v.lastName, email: v.email || null, phoneNumber: v.phoneNumber || null }
          : c,
      ),
    )
    setEditingContact(null)
  }

  function removeLocalContact(tempId: string) {
    setLocalContacts((prev) => {
      const next = prev.filter((c) => c._tempId !== tempId)
      if (next.length > 0 && !next.some((c) => c.isPrimary)) {
        next[0].isPrimary = true
      }
      return next
    })
  }

  function setLocalPrimaryContact(tempId: string) {
    setLocalContacts((prev) => prev.map((c) => ({ ...c, isPrimary: c._tempId === tempId })))
  }

  // Local address helpers (create mode)
  function addLocalAddress(v: AddressValues) {
    const isPrimary = localAddresses.length === 0
    setLocalAddresses((prev) => [
      ...prev,
      {
        _tempId: Math.random().toString(36).slice(2),
        street: v.street,
        houseNumber: v.houseNumber,
        postalCode: v.postalCode,
        city: v.city,
        province: v.province || null,
        country: v.country,
        isPrimary,
      },
    ])
    setShowAddressForm(false)
  }

  function updateLocalAddress(tempId: string, v: AddressValues) {
    setLocalAddresses((prev) =>
      prev.map((a) =>
        a._tempId === tempId
          ? {
              ...a,
              street: v.street,
              houseNumber: v.houseNumber,
              postalCode: v.postalCode,
              city: v.city,
              province: v.province || null,
              country: v.country,
            }
          : a,
      ),
    )
    setEditingAddress(null)
  }

  function removeLocalAddress(tempId: string) {
    setLocalAddresses((prev) => {
      if (prev.length <= 1) return prev
      const next = prev.filter((a) => a._tempId !== tempId)
      if (next.length > 0 && !next.some((a) => a.isPrimary)) {
        next[0].isPrimary = true
      }
      return next
    })
  }

  function setLocalPrimaryAddress(tempId: string) {
    setLocalAddresses((prev) => prev.map((a) => ({ ...a, isPrimary: a._tempId === tempId })))
  }

  const editModeContacts: Contact[] = customerDetail?.contacts ?? []
  const editModeAddresses: Address[] = customerDetail?.addresses ?? []

  const drawerTitle = isEditMode ? `Edit customer` : 'New customer'

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel drawer-panel--wide" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2 className="drawer-title">{drawerTitle}</h2>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="drawer-body">
          <div className="cust-drawer-tabs">
            {(['general', 'contacts', 'addresses'] as Tab[]).map((t) => (
              <button
                key={t}
                className={`cust-drawer-tab${tab === t ? ' cust-drawer-tab--active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {tab === 'general' && (
            <GeneralTab
              isEditMode={isEditMode}
              customerDetail={customerDetail ?? null}
              form={generalForm}
              onSaveEdit={(v) => updateGeneralMutation.mutate(v)}
              saving={updateGeneralMutation.isPending}
            />
          )}

          {tab === 'contacts' && (
            <ContactsTab
              isEditMode={isEditMode}
              localContacts={localContacts}
              editModeContacts={editModeContacts}
              showForm={showContactForm}
              editingContact={editingContact}
              onShowForm={() => { setShowContactForm(true); setEditingContact(null) }}
              onCancelForm={() => { setShowContactForm(false); setEditingContact(null) }}
              onAddLocal={addLocalContact}
              onUpdateLocal={updateLocalContact}
              onRemoveLocal={removeLocalContact}
              onSetPrimaryLocal={setLocalPrimaryContact}
              onAddEdit={(v) =>
                createContactMutation.mutate({
                  firstName: v.firstName,
                  lastName: v.lastName,
                  email: v.email || null,
                  phoneNumber: v.phoneNumber || null,
                })
              }
              onUpdateEdit={(contactId, v) =>
                updateContactMutation.mutate({
                  contactId,
                  body: { firstName: v.firstName, lastName: v.lastName, email: v.email || null, phoneNumber: v.phoneNumber || null },
                })
              }
              onRemoveEdit={(contactId) => deleteContactMutation.mutate(contactId)}
              onSetPrimaryEdit={(contactId) => setPrimaryContactMutation.mutate(contactId)}
              onStartEdit={(c) => { setEditingContact(c); setShowContactForm(false) }}
            />
          )}

          {tab === 'addresses' && (
            <AddressesTab
              isEditMode={isEditMode}
              localAddresses={localAddresses}
              editModeAddresses={editModeAddresses}
              showForm={showAddressForm}
              editingAddress={editingAddress}
              onShowForm={() => { setShowAddressForm(true); setEditingAddress(null) }}
              onCancelForm={() => { setShowAddressForm(false); setEditingAddress(null) }}
              onAddLocal={addLocalAddress}
              onUpdateLocal={updateLocalAddress}
              onRemoveLocal={removeLocalAddress}
              onSetPrimaryLocal={setLocalPrimaryAddress}
              onAddEdit={(v) =>
                createAddressMutation.mutate({
                  street: v.street,
                  houseNumber: v.houseNumber,
                  postalCode: v.postalCode,
                  city: v.city,
                  province: v.province || null,
                  country: v.country,
                })
              }
              onUpdateEdit={(addressId, v) =>
                updateAddressMutation.mutate({
                  addressId,
                  body: { street: v.street, houseNumber: v.houseNumber, postalCode: v.postalCode, city: v.city, province: v.province || null, country: v.country },
                })
              }
              onRemoveEdit={(addressId) => deleteAddressMutation.mutate(addressId)}
              onSetPrimaryEdit={(addressId) => setPrimaryAddressMutation.mutate(addressId)}
              onStartEdit={(a) => { setEditingAddress(a); setShowAddressForm(false) }}
            />
          )}
        </div>

        <div className="drawer-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 0 }}>
          {isEditMode ? (
            <button className="users-action-btn" onClick={onClose}>
              Close
            </button>
          ) : (
            <>
              <button className="users-action-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                className="exact-btn exact-btn-primary"
                onClick={handleCreateSubmit}
                disabled={createCustomerMutation.isPending}
              >
                {createCustomerMutation.isPending ? 'Creating…' : 'Create customer'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function GeneralTab({
  isEditMode,
  customerDetail,
  form,
  onSaveEdit,
  saving,
}: {
  isEditMode: boolean
  customerDetail: CustomerDetail | null
  form: ReturnType<typeof useForm<GeneralValues>>
  onSaveEdit: (v: GeneralValues) => void
  saving: boolean
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {isEditMode && customerDetail && (
        <div style={{ marginBottom: '0.5rem' }}>
          <div className="modal-label">Customer #</div>
          <div className="cust-readonly-value">{customerDetail.customerNumber}</div>
        </div>
      )}

      {!isEditMode && (
        <p style={{ fontSize: '0.8rem', color: '#6b6e87', margin: '0 0 0.5rem' }}>
          At least one address is required. Add it in the Addresses tab.
        </p>
      )}

      <div>
        <label className="modal-label" htmlFor="cust-name">Name *</label>
        <input id="cust-name" className="modal-input" {...register('name')} />
        {errors.name && <p className="drawer-field-error">{errors.name.message}</p>}
      </div>

      <div>
        <label className="modal-label" htmlFor="cust-company">Company name</label>
        <input id="cust-company" className="modal-input" {...register('companyName')} />
      </div>

      <div>
        <label className="modal-label" htmlFor="cust-email">Email *</label>
        <input id="cust-email" className="modal-input" type="email" {...register('email')} />
        {errors.email && <p className="drawer-field-error">{errors.email.message}</p>}
      </div>

      <div>
        <label className="modal-label" htmlFor="cust-phone">Phone</label>
        <input id="cust-phone" className="modal-input" {...register('phoneNumber')} />
      </div>

      <div>
        <label className="modal-label" htmlFor="cust-country">Country *</label>
        <input id="cust-country" className="modal-input" {...register('country')} />
        {errors.country && <p className="drawer-field-error">{errors.country.message}</p>}
      </div>

      <div>
        <label className="modal-label" htmlFor="cust-vat">VAT number</label>
        <input id="cust-vat" className="modal-input" {...register('vatNumber')} />
      </div>

      <div>
        <label className="modal-label" htmlFor="cust-status">Status</label>
        <select id="cust-status" className="modal-select" {...register('status')}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div>
        <label className="modal-label" htmlFor="cust-enddate">End date</label>
        <input id="cust-enddate" className="modal-input" type="date" {...register('endDate')} />
      </div>

      {isEditMode && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button
            className="exact-btn exact-btn-primary"
            onClick={handleSubmit(onSaveEdit)}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </div>
  )
}

function ContactsTab({
  isEditMode,
  localContacts,
  editModeContacts,
  showForm,
  editingContact,
  onShowForm,
  onCancelForm,
  onAddLocal,
  onUpdateLocal,
  onRemoveLocal,
  onSetPrimaryLocal,
  onAddEdit,
  onUpdateEdit,
  onRemoveEdit,
  onSetPrimaryEdit,
  onStartEdit,
}: {
  isEditMode: boolean
  localContacts: LocalContact[]
  editModeContacts: Contact[]
  showForm: boolean
  editingContact: LocalContact | Contact | null
  onShowForm: () => void
  onCancelForm: () => void
  onAddLocal: (v: ContactValues) => void
  onUpdateLocal: (tempId: string, v: ContactValues) => void
  onRemoveLocal: (tempId: string) => void
  onSetPrimaryLocal: (tempId: string) => void
  onAddEdit: (v: ContactValues) => void
  onUpdateEdit: (contactId: number, v: ContactValues) => void
  onRemoveEdit: (contactId: number) => void
  onSetPrimaryEdit: (contactId: number) => void
  onStartEdit: (c: LocalContact | Contact) => void
}) {
  const contacts = isEditMode ? editModeContacts : localContacts
  const atMax = contacts.length >= 10

  return (
    <div>
      <div className="cust-sub-list">
        {contacts.map((c) => {
          const isLocal = '_tempId' in c
          const localC = isLocal ? (c as LocalContact) : null
          const apiC = !isLocal ? (c as Contact) : null
          const isEditingThis = editingContact
            ? isLocal
              ? '_tempId' in editingContact && (editingContact as LocalContact)._tempId === localC?._tempId
              : 'id' in editingContact && (editingContact as Contact).id === apiC?.id
            : false

          return (
            <div key={isLocal ? localC!._tempId : apiC!.id}>
              <div className="cust-sub-item">
                <div className="cust-sub-item-info">
                  <div className="cust-sub-item-name">
                    {c.firstName} {c.lastName}
                    {c.isPrimary && <span className="cust-primary-badge" style={{ marginLeft: 6 }}>Primary</span>}
                  </div>
                  <div className="cust-sub-item-meta">
                    {c.email && <span>{c.email}</span>}
                    {c.email && c.phoneNumber && <span> · </span>}
                    {c.phoneNumber && <span>{c.phoneNumber}</span>}
                  </div>
                </div>
                <div className="cust-sub-actions">
                  {!c.isPrimary && (
                    <button
                      className="cust-sub-btn"
                      onClick={() => isLocal ? onSetPrimaryLocal(localC!._tempId) : onSetPrimaryEdit(apiC!.id)}
                    >
                      Set primary
                    </button>
                  )}
                  <button
                    className="cust-sub-btn"
                    onClick={() => onStartEdit(c)}
                  >
                    Edit
                  </button>
                  <button
                    className="cust-sub-btn cust-sub-btn-danger"
                    onClick={() => isLocal ? onRemoveLocal(localC!._tempId) : onRemoveEdit(apiC!.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              {isEditingThis && (
                <ContactForm
                  defaultValues={{
                    firstName: c.firstName,
                    lastName: c.lastName,
                    email: c.email ?? '',
                    phoneNumber: c.phoneNumber ?? '',
                  }}
                  onSubmit={(v) =>
                    isLocal
                      ? onUpdateLocal(localC!._tempId, v)
                      : onUpdateEdit(apiC!.id, v)
                  }
                  onCancel={onCancelForm}
                  submitLabel="Save"
                />
              )}
            </div>
          )
        })}
      </div>

      {showForm && (
        <ContactForm
          onSubmit={isEditMode ? onAddEdit : onAddLocal}
          onCancel={onCancelForm}
          submitLabel="Add"
        />
      )}

      {!showForm && !editingContact && (
        <button
          className="cust-add-btn"
          onClick={onShowForm}
          disabled={atMax}
          title={atMax ? 'Maximum 10 contacts reached' : undefined}
        >
          {atMax ? 'Maximum 10 contacts reached' : '+ Add contact'}
        </button>
      )}
    </div>
  )
}

function AddressesTab({
  isEditMode,
  localAddresses,
  editModeAddresses,
  showForm,
  editingAddress,
  onShowForm,
  onCancelForm,
  onAddLocal,
  onUpdateLocal,
  onRemoveLocal,
  onSetPrimaryLocal,
  onAddEdit,
  onUpdateEdit,
  onRemoveEdit,
  onSetPrimaryEdit,
  onStartEdit,
}: {
  isEditMode: boolean
  localAddresses: LocalAddress[]
  editModeAddresses: Address[]
  showForm: boolean
  editingAddress: LocalAddress | Address | null
  onShowForm: () => void
  onCancelForm: () => void
  onAddLocal: (v: AddressValues) => void
  onUpdateLocal: (tempId: string, v: AddressValues) => void
  onRemoveLocal: (tempId: string) => void
  onSetPrimaryLocal: (tempId: string) => void
  onAddEdit: (v: AddressValues) => void
  onUpdateEdit: (addressId: number, v: AddressValues) => void
  onRemoveEdit: (addressId: number) => void
  onSetPrimaryEdit: (addressId: number) => void
  onStartEdit: (a: LocalAddress | Address) => void
}) {
  const addresses = isEditMode ? editModeAddresses : localAddresses
  const atMax = addresses.length >= 10

  return (
    <div>
      <div className="cust-sub-list">
        {addresses.map((a) => {
          const isLocal = '_tempId' in a
          const localA = isLocal ? (a as LocalAddress) : null
          const apiA = !isLocal ? (a as Address) : null
          const isEditingThis = editingAddress
            ? isLocal
              ? '_tempId' in editingAddress && (editingAddress as LocalAddress)._tempId === localA?._tempId
              : 'id' in editingAddress && (editingAddress as Address).id === apiA?.id
            : false

          const canRemove = addresses.length > 1

          return (
            <div key={isLocal ? localA!._tempId : apiA!.id}>
              <div className="cust-sub-item">
                <div className="cust-sub-item-info">
                  <div className="cust-sub-item-name">
                    {a.street} {a.houseNumber}
                    {a.isPrimary && <span className="cust-primary-badge" style={{ marginLeft: 6 }}>Primary</span>}
                  </div>
                  <div className="cust-sub-item-meta">
                    {a.postalCode} {a.city}
                    {a.province && `, ${a.province}`}
                    {' · '}{a.country}
                  </div>
                </div>
                <div className="cust-sub-actions">
                  {!a.isPrimary && (
                    <button
                      className="cust-sub-btn"
                      onClick={() => isLocal ? onSetPrimaryLocal(localA!._tempId) : onSetPrimaryEdit(apiA!.id)}
                    >
                      Set primary
                    </button>
                  )}
                  <button
                    className="cust-sub-btn"
                    onClick={() => onStartEdit(a)}
                  >
                    Edit
                  </button>
                  <button
                    className="cust-sub-btn cust-sub-btn-danger"
                    disabled={!canRemove}
                    title={!canRemove ? 'Cannot remove the only address' : undefined}
                    onClick={() => canRemove && (isLocal ? onRemoveLocal(localA!._tempId) : onRemoveEdit(apiA!.id))}
                  >
                    Remove
                  </button>
                </div>
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
                  onSubmit={(v) =>
                    isLocal
                      ? onUpdateLocal(localA!._tempId, v)
                      : onUpdateEdit(apiA!.id, v)
                  }
                  onCancel={onCancelForm}
                  submitLabel="Save"
                />
              )}
            </div>
          )
        })}
      </div>

      {showForm && (
        <AddressForm
          onSubmit={isEditMode ? onAddEdit : onAddLocal}
          onCancel={onCancelForm}
          submitLabel="Add"
        />
      )}

      {!showForm && !editingAddress && (
        <button
          className="cust-add-btn"
          onClick={onShowForm}
          disabled={atMax}
          title={atMax ? 'Maximum 10 addresses reached' : undefined}
        >
          {atMax ? 'Maximum 10 addresses reached' : '+ Add address'}
        </button>
      )}
    </div>
  )
}
