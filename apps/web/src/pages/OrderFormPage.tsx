import { useState, useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import {
  getOrder,
  createOrder,
  updateOrder,
  addLineItem,
  updateLineItem,
  removeLineItem,
  type DeliveryOption,
} from '../api/orders'
import { getCustomers, getCustomer, type Address } from '../api/customers'
import { getUsers } from '../api/admin'
import { getPimProducts, getPimProductById, type PimProduct } from '../api/pim-products'
import { getApiError } from '../utils/format'
import type { RootState } from '../store'

const FREE_SHIPPING_THRESHOLD = 150

const step1Schema = z.object({
  customerId: z.number().int().positive().optional(),
  shippingAddressId: z.number().int().positive().optional(),
  deliveryOption: z.enum(['dhl', 'ups', 'pickup'], { required_error: 'Delivery option is required' }),
  shippingCost: z.number().min(0).default(0),
  vatPercentage: z.number().min(0).max(100).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  trackingUrl: z.string().url('Must be a valid URL').nullable().optional().or(z.literal('')),
  newAddressStreet: z.string().min(1, 'Required').optional(),
  newAddressHouseNumber: z.string().min(1, 'Required').optional(),
  newAddressPostalCode: z.string().min(1, 'Required').optional(),
  newAddressCity: z.string().min(1, 'Required').optional(),
  newAddressProvince: z.string().optional(),
  newAddressCountry: z.string().min(1, 'Required').optional(),
})

const lineItemSchema = z.object({
  productId: z.number().int().positive(),
  productName: z.string(),
  stock: z.number().nullable(),
  existingItemId: z.number().optional(),
  quantity: z.number().int().min(1, 'Min 1'),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).max(100),
})

const formSchema = step1Schema.extend({
  lineItems: z
    .array(lineItemSchema)
    .min(1, 'At least one line item is required'),
})

type FormValues = z.infer<typeof formSchema>

function getProductName(p: PimProduct): string {
  return p.name?.nl ?? p.name?.en ?? p.name?.de ?? 'Unnamed'
}

function formatAddress(a: Address): string {
  return `${a.street} ${a.houseNumber}, ${a.postalCode} ${a.city}`
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function OrderFormPage({ orderId, prefillProductId }: { orderId?: number; prefillProductId?: number }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = orderId != null

  const user = useSelector((s: RootState) => s.auth.user)
  const isAdmin = user?.role === 'admin'
  const buyerCustomerId = isAdmin ? null : (user?.customerId ?? null)

  const [step, setStep] = useState(1)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const [selectedCustomerAddresses, setSelectedCustomerAddresses] = useState<Address[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [productDropdownOpen, setProductDropdownOpen] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null)
  const [selectedUserName, setSelectedUserName] = useState('')
  const [selectedUserHasNoCustomer, setSelectedUserHasNoCustomer] = useState(false)

  const showManualAddress =
    !isEdit &&
    ((!isAdmin && buyerCustomerId == null) || (isAdmin && selectedUserHasNoCustomer))

  const debouncedCustomerSearch = useDebounce(customerSearch, 300)
  const debouncedProductSearch = useDebounce(productSearch, 300)
  const debouncedUserSearch = useDebounce(userSearch, 300)

  const customerSearchRef = useRef<HTMLDivElement>(null)
  const productSearchRef = useRef<HTMLDivElement>(null)
  const userSearchRef = useRef<HTMLDivElement>(null)

  const { data: existingOrder, isLoading: orderLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId!).then((r) => r.data),
    enabled: isEdit,
  })

  const { data: customersData } = useQuery({
    queryKey: ['customers-search', debouncedCustomerSearch],
    queryFn: () =>
      getCustomers({ search: debouncedCustomerSearch || undefined, limit: 50 }).then(
        (r) => r.data,
      ),
    enabled: isAdmin,
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-search', debouncedProductSearch],
    queryFn: () =>
      getPimProducts({ search: debouncedProductSearch || undefined, status: 'active', limit: 20 }).then(
        (r) => r.data,
      ),
    enabled: step === 2,
  })

  const {
    register,
    control,
    handleSubmit,
    trigger,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deliveryOption: 'dhl',
      shippingCost: 0,
      lineItems: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' })

  const watchedLineItems = useWatch({ control, name: 'lineItems' })
  const watchedVatPercentage = useWatch({ control, name: 'vatPercentage' })
  const watchedShippingCost = useWatch({ control, name: 'shippingCost' })
  const watchedCustomerId = useWatch({ control, name: 'customerId' })
  const watchedShippingAddressId = useWatch({ control, name: 'shippingAddressId' })
  const watchedDeliveryOption = useWatch({ control, name: 'deliveryOption' })

  const { data: usersData } = useQuery({
    queryKey: ['users-search', debouncedUserSearch, watchedCustomerId],
    queryFn: () =>
      getUsers(1, 50, {
        search: debouncedUserSearch || undefined,
        customerId: watchedCustomerId || undefined,
      }).then((r) => r.data),
    enabled: isAdmin,
  })

  useEffect(() => {
    if (isAdmin || buyerCustomerId == null || isEdit) return
    setValue('customerId', buyerCustomerId)
    getCustomer(buyerCustomerId).then((res) => {
      setCustomerSearch(res.data.name)
      setSelectedCustomerAddresses(res.data.addresses ?? [])
      const primary = res.data.addresses?.find((a) => a.isPrimary) ?? res.data.addresses?.[0]
      if (primary) setValue('shippingAddressId', primary.id)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!prefillProductId) return
    getPimProductById(prefillProductId).then((res) => {
      const p = res.data
      if (p.status !== 'active') {
        toast.error('This product is inactive and cannot be added to an order')
        return
      }
      if (getValues('lineItems').some((li) => li.productId === p.id)) return
      append({
        productId: p.id,
        productName: p.name?.nl ?? p.name?.en ?? p.name?.de ?? 'Unnamed',
        stock: p.stock,
        quantity: 1,
        unitPrice: p.basePrice ?? 0,
        discount: 0,
      })
    })
  }, [prefillProductId]) // eslint-disable-line react-hooks/exhaustive-deps

  const [prefilled, setPrefilled] = useState(false)

  useEffect(() => {
    if (!existingOrder || prefilled) return
    setValue('deliveryOption', existingOrder.deliveryOption)
    setValue('shippingCost', existingOrder.shippingCost)
    setValue('vatPercentage', existingOrder.vatPercentage)
    setValue('description', existingOrder.description)
    setValue('trackingUrl', existingOrder.trackingUrl)
    setValue('customerId', existingOrder.customerId)
    setValue('shippingAddressId', existingOrder.shippingAddress?.id)
    setCustomerSearch(existingOrder.customer?.name ?? '')
    setValue(
      'lineItems',
      existingOrder.lineItems.map((li) => ({
        productId: li.productId,
        productName: li.productName,
        stock: null,
        existingItemId: li.id,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        discount: li.discount,
      })),
    )
    getCustomer(existingOrder.customerId).then((res) => {
      setSelectedCustomerAddresses(res.data.addresses ?? [])
    })
    setPrefilled(true)
  }, [existingOrder, prefilled, setValue])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
        setCustomerDropdownOpen(false)
      }
      if (productSearchRef.current && !productSearchRef.current.contains(e.target as Node)) {
        setProductDropdownOpen(false)
      }
      if (userSearchRef.current && !userSearchRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await createOrder({
        customerId: values.customerId,
        shippingAddressId: values.shippingAddressId,
        deliveryOption: values.deliveryOption as DeliveryOption,
        description: values.description,
        vatPercentage: values.vatPercentage,
        shippingCost: values.shippingCost,
        lineItems: values.lineItems.map((li) => ({
          productId: li.productId,
          quantity: li.quantity,
          discount: li.discount,
        })),
        onBehalfOf: selectedUserEmail ?? undefined,
        newAddress: showManualAddress && values.newAddressStreet ? {
          street: values.newAddressStreet!,
          houseNumber: values.newAddressHouseNumber!,
          postalCode: values.newAddressPostalCode!,
          city: values.newAddressCity!,
          province: values.newAddressProvince || undefined,
          country: values.newAddressCountry!,
        } : undefined,
      })
      const newOrder = res.data
      if (values.trackingUrl) {
        await updateOrder(newOrder.id, { trackingUrl: values.trackingUrl })
      }
      return newOrder
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['recent-orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders-count'] })
      toast.success('Order created')
      navigate({ to: '/orders/$id', params: { id: String(order.id) } })
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const editMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const orig = existingOrder!
      const patchBody: Parameters<typeof updateOrder>[1] = {}
      if (values.description !== orig.description) patchBody.description = values.description
      if (values.deliveryOption !== orig.deliveryOption) patchBody.deliveryOption = values.deliveryOption as DeliveryOption
      if (values.trackingUrl !== orig.trackingUrl) patchBody.trackingUrl = values.trackingUrl
      if (values.shippingAddressId !== orig.shippingAddress?.id) patchBody.shippingAddressId = values.shippingAddressId
      if (values.shippingCost !== orig.shippingCost) patchBody.shippingCost = values.shippingCost

      const promises: Promise<unknown>[] = []

      if (Object.keys(patchBody).length > 0) {
        promises.push(updateOrder(orderId!, patchBody))
      }

      const origIds = new Set(orig.lineItems.map((li) => li.id))
      const formIds = new Set(
        values.lineItems.filter((li) => li.existingItemId != null).map((li) => li.existingItemId!),
      )

      for (const origLi of orig.lineItems) {
        if (!formIds.has(origLi.id)) {
          promises.push(removeLineItem(orderId!, origLi.id))
        }
      }

      for (const li of values.lineItems) {
        if (li.existingItemId != null) {
          const origLi = orig.lineItems.find((o) => o.id === li.existingItemId)
          if (
            origLi &&
            (li.quantity !== origLi.quantity ||
              li.discount !== origLi.discount)
          ) {
            promises.push(
              updateLineItem(orderId!, li.existingItemId, {
                quantity: li.quantity,
                discount: li.discount,
              }),
            )
          }
        } else {
          promises.push(
            addLineItem(orderId!, {
              productId: li.productId,
              quantity: li.quantity,
              discount: li.discount,
            }),
          )
        }
      }

      await Promise.all(promises)
      return orderId!
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Order updated')
      navigate({ to: '/orders/$id', params: { id: String(id) } })
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const isPending = createMutation.isPending || editMutation.isPending

  async function goNext() {
    let valid = false
    if (step === 1) {
      if (isAdmin && !selectedUserEmail) {
        toast.error('Please assign this order to a user')
        return
      }
      const step1Fields: Array<keyof FormValues> = [
        'deliveryOption', 'vatPercentage', 'shippingCost', 'description', 'trackingUrl',
      ]
      if (!isAdmin || !selectedUserHasNoCustomer) {
        step1Fields.push('customerId', 'shippingAddressId')
      }
      if (showManualAddress) {
        step1Fields.push('newAddressStreet', 'newAddressHouseNumber', 'newAddressPostalCode', 'newAddressCity', 'newAddressCountry')
      }
      valid = await trigger(step1Fields)
    } else if (step === 2) {
      valid = await trigger(['lineItems'])
    }
    if (valid) setStep((s) => s + 1)
  }

  function onSubmit(values: FormValues) {
    if (isEdit) {
      editMutation.mutate(values)
    } else {
      createMutation.mutate(values)
    }
  }

  const lineItemTotals = (watchedLineItems ?? []).map((li) => {
    const qty = Number(li?.quantity ?? 0)
    const price = Number(li?.unitPrice ?? 0)
    const disc = Number(li?.discount ?? 0)
    return price * qty * (1 - disc / 100)
  })

  const totalExclVat = lineItemTotals.reduce((s, t) => s + t, 0)
  const freeShippingApplied = totalExclVat >= FREE_SHIPPING_THRESHOLD
  const effectiveShipping = freeShippingApplied ? 0 : Number(watchedShippingCost ?? 0)
  const vatPct = Number(watchedVatPercentage ?? 0)
  const vatAmount = vatPct > 0 ? totalExclVat * (vatPct / 100) : 0
  const totalInclVat = totalExclVat + vatAmount + effectiveShipping

  const customers = customersData?.data ?? []
  const products = productsData?.data ?? []
  const addresses = selectedCustomerAddresses

  if (isEdit && orderLoading) {
    return (
      <div className="profile-loading">
        <div className="spinner-border" style={{ color: '#7c3aed' }} role="status" />
      </div>
    )
  }

  if (
    isEdit &&
    existingOrder &&
    (existingOrder.status === 'completed' || existingOrder.status === 'cancelled')
  ) {
    return (
      <div className="cust-detail-page">
        <div>
          <button className="cust-back-btn" onClick={() => navigate({ to: '/orders/$id', params: { id: String(orderId) } })}>
            ← Back
          </button>
        </div>
        <div className="dash-card" style={{ padding: '2rem', textAlign: 'center', color: '#9396a5' }}>
          This order cannot be edited (status: {existingOrder.status})
        </div>
      </div>
    )
  }

  const selectedAddressObj = addresses.find((a) => a.id === watchedShippingAddressId)
  const selectedCustomerName = customerSearch || (existingOrder?.customer?.name ?? '')

  return (
    <div className="cust-detail-page">
      <div>
        <button
          className="cust-back-btn"
          onClick={() =>
            isEdit
              ? navigate({ to: '/orders/$id', params: { id: String(orderId) } })
              : navigate({ to: '/orders' })
          }
        >
          {isEdit ? `← Order #${existingOrder?.orderNumber ?? orderId}` : '← Orders'}
        </button>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <div className="dash-card-title">{isEdit ? 'Edit Order' : 'New Order'}</div>
          </div>
        </div>

        <div className="order-form-steps">
          {['Customer & Delivery', 'Line Items', 'Summary'].map((label, i) => (
            <div
              key={i}
              className={`order-form-step${step === i + 1 ? ' order-form-step--active' : step > i + 1 ? ' order-form-step--done' : ''}`}
            >
              <span className="order-form-step-num">{i + 1}</span>
              <span className="order-form-step-label">{label}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {step === 1 && (
            <div className="order-form-step-body">
              {!isAdmin ? (
                <div className="modal-field">
                  <label className="modal-label">Customer</label>
                  <div className="cust-detail-value">{customerSearch || '—'}</div>
                </div>
              ) : (
                <div className="modal-field" ref={customerSearchRef} style={{ position: 'relative' }}>
                  <label className="modal-label">Customer *</label>
                  <input
                    className="modal-input"
                    type="text"
                    placeholder="Search customers…"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value)
                      setCustomerDropdownOpen(true)
                      if (!e.target.value) {
                        setSelectedCustomerAddresses([])
                        setValue('customerId', undefined as unknown as number)
                        setValue('shippingAddressId', undefined as unknown as number)
                      }
                    }}
                    onFocus={() => setCustomerDropdownOpen(true)}
                    autoComplete="off"
                  />
                  {customerDropdownOpen && customers.length > 0 && (
                    <div className="order-form-product-list">
                      {customers.map((c) => (
                        <div
                          key={c.id}
                          className="order-form-product-item"
                          onMouseDown={() => {
                            setCustomerSearch(c.name)
                            setValue('customerId', c.id)
                            setValue('shippingAddressId', undefined as unknown as number)
                            setCustomerDropdownOpen(false)
                            setSelectedUserEmail(null)
                            setSelectedUserName('')
                            setUserSearch('')
                            getCustomer(c.id).then((res) => {
                              const addrs = res.data.addresses ?? []
                              setSelectedCustomerAddresses(addrs)
                              const primary = addrs.find((a) => a.isPrimary) ?? addrs[0]
                              if (primary) setValue('shippingAddressId', primary.id)
                            })
                          }}
                        >
                          <span style={{ color: '#e0e2f0', fontWeight: 500 }}>{c.name}</span>
                          <span className="users-td-muted" style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                            {c.email}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.customerId && (
                    <div className="order-form-error">{errors.customerId.message}</div>
                  )}
                </div>
              )}

              {isAdmin && (
                <div className="modal-field" ref={userSearchRef} style={{ position: 'relative' }}>
                  <label className="modal-label">Assign to user *</label>
                  <input
                    className="modal-input"
                    type="text"
                    placeholder="Search users…"
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value)
                      setUserDropdownOpen(true)
                      if (!e.target.value) {
                        setSelectedUserEmail(null)
                        setSelectedUserName('')
                        setSelectedUserHasNoCustomer(false)
                      }
                    }}
                    onFocus={() => setUserDropdownOpen(true)}
                    autoComplete="off"
                  />
                  {selectedUserName && (
                    <div style={{ fontSize: '0.78rem', color: '#9396a5', marginTop: '0.25rem' }}>
                      Order will appear in {selectedUserName}'s dashboard
                    </div>
                  )}
                  {userDropdownOpen && (usersData?.data ?? []).length > 0 && (
                    <div className="order-form-product-list">
                      {(usersData?.data ?? []).map((u) => (
                        <div
                          key={u.id}
                          className="order-form-product-item"
                          onMouseDown={() => {
                            setSelectedUserEmail(u.email)
                            setSelectedUserName(u.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : u.email)
                            setUserSearch(u.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : u.email)
                            setUserDropdownOpen(false)
                            setSelectedUserHasNoCustomer(u.customerId == null)
                            if (u.customerId && !watchedCustomerId) {
                              setValue('customerId', u.customerId)
                              getCustomer(u.customerId).then((res) => {
                                setCustomerSearch(res.data.name)
                                const addrs = res.data.addresses ?? []
                                setSelectedCustomerAddresses(addrs)
                                const primary = addrs.find((a) => a.isPrimary) ?? addrs[0]
                                if (primary) setValue('shippingAddressId', primary.id)
                              })
                            }
                          }}
                        >
                          <span style={{ color: '#e0e2f0', fontWeight: 500 }}>
                            {u.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : u.email}
                          </span>
                          <span className="users-td-muted" style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                            {u.email}
                            {u.customerId == null && ' · no customer'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {addresses.length > 0 && !(isAdmin && selectedUserHasNoCustomer) && (
                <div className="modal-field">
                  <label className="modal-label">Shipping address *</label>
                  <select
                    className="modal-select"
                    value={watchedShippingAddressId ?? ''}
                    onChange={(e) => setValue('shippingAddressId', Number(e.target.value))}
                  >
                    <option value="">Select address…</option>
                    {addresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {formatAddress(a)}
                      </option>
                    ))}
                  </select>
                  {errors.shippingAddressId && (
                    <div className="order-form-error">{errors.shippingAddressId.message}</div>
                  )}
                </div>
              )}

              <div className="modal-field">
                <label className="modal-label">Delivery option *</label>
                <select className="modal-select" {...register('deliveryOption')}>
                  <option value="dhl">DHL</option>
                  <option value="ups">UPS</option>
                  <option value="pickup">Pickup</option>
                </select>
                {errors.deliveryOption && (
                  <div className="order-form-error">{errors.deliveryOption.message}</div>
                )}
              </div>

              {showManualAddress && (
                <>
                  <div className="modal-field">
                    <label className="modal-label">Street *</label>
                    <input className="modal-input" type="text" {...register('newAddressStreet')} />
                    {errors.newAddressStreet && <div className="order-form-error">{errors.newAddressStreet.message}</div>}
                  </div>
                  <div className="modal-field">
                    <label className="modal-label">House number *</label>
                    <input className="modal-input" type="text" {...register('newAddressHouseNumber')} />
                    {errors.newAddressHouseNumber && <div className="order-form-error">{errors.newAddressHouseNumber.message}</div>}
                  </div>
                  <div className="modal-field">
                    <label className="modal-label">Postal code *</label>
                    <input className="modal-input" type="text" {...register('newAddressPostalCode')} />
                    {errors.newAddressPostalCode && <div className="order-form-error">{errors.newAddressPostalCode.message}</div>}
                  </div>
                  <div className="modal-field">
                    <label className="modal-label">City *</label>
                    <input className="modal-input" type="text" {...register('newAddressCity')} />
                    {errors.newAddressCity && <div className="order-form-error">{errors.newAddressCity.message}</div>}
                  </div>
                  <div className="modal-field">
                    <label className="modal-label">Province</label>
                    <input className="modal-input" type="text" {...register('newAddressProvince')} />
                  </div>
                  <div className="modal-field">
                    <label className="modal-label">Country *</label>
                    <input className="modal-input" type="text" {...register('newAddressCountry')} />
                    {errors.newAddressCountry && <div className="order-form-error">{errors.newAddressCountry.message}</div>}
                  </div>
                </>
              )}

              {isAdmin && (
                <div className="modal-field">
                  <label className="modal-label">Shipping cost (€)</label>
                  <input
                    className="modal-input"
                    type="number"
                    min={0}
                    step="0.01"
                    {...register('shippingCost', { valueAsNumber: true })}
                  />
                  {errors.shippingCost && (
                    <div className="order-form-error">{errors.shippingCost.message}</div>
                  )}
                </div>
              )}

              {isAdmin && (
                <div className="modal-field">
                  <label className="modal-label">VAT %</label>
                  {isEdit ? (
                    <div>
                      <span style={{ color: '#e0e2f0' }}>{existingOrder?.vatPercentage ?? 0}%</span>
                      <div className="users-td-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        VAT cannot be changed after order creation.
                      </div>
                    </div>
                  ) : (
                    <input
                      className="modal-input"
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      placeholder="0"
                      {...register('vatPercentage', { valueAsNumber: true })}
                    />
                  )}
                  {errors.vatPercentage && (
                    <div className="order-form-error">{errors.vatPercentage.message}</div>
                  )}
                </div>
              )}

              <div className="modal-field">
                <label className="modal-label">Description</label>
                <textarea
                  className="modal-input"
                  rows={3}
                  style={{ resize: 'vertical' }}
                  {...register('description')}
                />
                {errors.description && (
                  <div className="order-form-error">{errors.description.message}</div>
                )}
              </div>

              <div className="modal-field">
                <label className="modal-label">Tracking URL</label>
                <input
                  className="modal-input"
                  type="url"
                  placeholder="https://…"
                  {...register('trackingUrl')}
                />
                {!isEdit && (
                  <div className="users-td-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    Tracking URL will be saved after order creation.
                  </div>
                )}
                {errors.trackingUrl && (
                  <div className="order-form-error">{errors.trackingUrl.message}</div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="order-form-step-body">
              <div
                className="order-form-product-search"
                ref={productSearchRef}
                style={{ position: 'relative' }}
              >
                <label className="modal-label">Add product</label>
                <input
                  className="modal-input"
                  type="text"
                  placeholder="Search products…"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value)
                    setProductDropdownOpen(true)
                  }}
                  onFocus={() => setProductDropdownOpen(true)}
                  autoComplete="off"
                />
                {productDropdownOpen && products.length > 0 && (
                  <div className="order-form-product-list">
                    {products.slice(0, 10).map((p) => {
                      const alreadyAdded = (watchedLineItems ?? []).some(
                        (li) => li?.productId === p.id,
                      )
                      return (
                        <div
                          key={p.id}
                          className={`order-form-product-item${alreadyAdded ? ' order-form-product-item--disabled' : ''}`}
                          onMouseDown={() => {
                            if (alreadyAdded) return
                            append({
                              productId: p.id,
                              productName: getProductName(p),
                              stock: p.stock,
                              quantity: 1,
                              unitPrice: p.basePrice ?? 0,
                              discount: 0,
                            })
                            setProductSearch('')
                            setProductDropdownOpen(false)
                          }}
                        >
                          <span style={{ color: '#e0e2f0', fontWeight: 500 }}>
                            {getProductName(p)}
                          </span>
                          <span className="users-td-muted" style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                            €{p.basePrice?.toFixed(2) ?? '—'} · stock: {p.stock ?? '—'}
                            {alreadyAdded && ' · already added'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {errors.lineItems?.root && (
                <div className="order-form-error" style={{ marginTop: '0.5rem' }}>
                  {errors.lineItems.root.message}
                </div>
              )}
              {typeof errors.lineItems?.message === 'string' && (
                <div className="order-form-error" style={{ marginTop: '0.5rem' }}>
                  {errors.lineItems.message}
                </div>
              )}

              {fields.length === 0 && (
                <div className="users-td-muted" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
                  No line items yet. Search for a product above.
                </div>
              )}

              {fields.length > 0 && (
                <div className="users-table-wrap" style={{ marginTop: '1rem' }}>
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Unit price (€)</th>
                        <th>Discount (%)</th>
                        <th>Line total</th>
                        <th>Stock</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, idx) => {
                        const li = watchedLineItems?.[idx]
                        const qty = Number(li?.quantity ?? 0)
                        const price = Number(li?.unitPrice ?? 0)
                        const disc = Number(li?.discount ?? 0)
                        const lineTotal = price * qty * (1 - disc / 100)
                        const stock = field.stock
                        const isFulfillable = stock != null && stock >= qty
                        return (
                          <tr key={field.id}>
                            <td style={{ color: '#e0e2f0' }}>{field.productName}</td>
                            <td>
                              <input
                                className="modal-input"
                                type="number"
                                min={1}
                                style={{ width: '70px' }}
                                {...register(`lineItems.${idx}.quantity`, { valueAsNumber: true })}
                              />
                              {errors.lineItems?.[idx]?.quantity && (
                                <div className="order-form-error">
                                  {errors.lineItems[idx]?.quantity?.message}
                                </div>
                              )}
                            </td>
                            <td className="users-td-muted">
                              €{price.toFixed(2)}
                            </td>
                            <td>
                              {isAdmin ? (
                                <input
                                  className="modal-input"
                                  type="number"
                                  min={0}
                                  max={100}
                                  step="0.01"
                                  style={{ width: '70px' }}
                                  {...register(`lineItems.${idx}.discount`, { valueAsNumber: true })}
                                />
                              ) : (
                                <span className="users-td-muted">0%</span>
                              )}
                            </td>
                            <td className="users-td-muted">€{lineTotal.toFixed(2)}</td>
                            <td>
                              {stock != null ? (
                                isFulfillable ? (
                                  <span className="order-li-fulfillable-yes">✓</span>
                                ) : (
                                  <span className="order-li-fulfillable-no">✗</span>
                                )
                              ) : (
                                <span className="users-td-muted">—</span>
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="exact-btn exact-btn-danger-outline"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                disabled={fields.length === 1}
                                onClick={() => remove(idx)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="order-form-step-body">
              <div className="dash-card" style={{ marginBottom: '1rem' }}>
                <div className="cust-section-header">
                  <div className="dash-card-title">Customer & Delivery</div>
                </div>
                <div className="cust-detail-field">
                  <span className="modal-label">Customer</span>
                  <span className="cust-detail-value">{selectedCustomerName}</span>
                </div>
                {showManualAddress && getValues('newAddressStreet') ? (
                  <div className="cust-detail-field">
                    <span className="modal-label">Shipping address</span>
                    <span className="cust-detail-value">
                      {getValues('newAddressStreet')} {getValues('newAddressHouseNumber')}, {getValues('newAddressPostalCode')} {getValues('newAddressCity')}
                    </span>
                  </div>
                ) : selectedAddressObj ? (
                  <div className="cust-detail-field">
                    <span className="modal-label">Shipping address</span>
                    <span className="cust-detail-value">{formatAddress(selectedAddressObj)}</span>
                  </div>
                ) : null}
                <div className="cust-detail-field">
                  <span className="modal-label">Delivery option</span>
                  <span className="cust-detail-value">
                    {watchedDeliveryOption
                      ? watchedDeliveryOption.charAt(0).toUpperCase() +
                        watchedDeliveryOption.slice(1)
                      : '—'}
                  </span>
                </div>
              </div>

              <div className="dash-card" style={{ marginBottom: '1rem' }}>
                <div className="cust-section-header">
                  <div className="dash-card-title">Line Items</div>
                </div>
                <div className="users-table-wrap">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Unit price</th>
                        <th>Discount</th>
                        <th>Line total</th>
                        <th>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, idx) => {
                        const li = watchedLineItems?.[idx]
                        const qty = Number(li?.quantity ?? 0)
                        const price = Number(li?.unitPrice ?? 0)
                        const disc = Number(li?.discount ?? 0)
                        const lineTotal = price * qty * (1 - disc / 100)
                        const stock = field.stock
                        const isFulfillable = stock != null && stock >= qty
                        return (
                          <tr key={field.id}>
                            <td style={{ color: '#e0e2f0' }}>{field.productName}</td>
                            <td className="users-td-muted">{qty}</td>
                            <td className="users-td-muted">€{price.toFixed(2)}</td>
                            <td className="users-td-muted">{disc}%</td>
                            <td className="users-td-muted">€{lineTotal.toFixed(2)}</td>
                            <td>
                              {stock != null ? (
                                isFulfillable ? (
                                  <span className="order-li-fulfillable-yes">✓</span>
                                ) : (
                                  <span className="order-li-fulfillable-no">✗</span>
                                )
                              ) : (
                                <span className="users-td-muted">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="dash-card">
                <div className="cust-section-header">
                  <div className="dash-card-title">Totals</div>
                </div>
                <div className="order-totals-row">
                  <span className="order-totals-label">Total excl. VAT</span>
                  <span className="order-totals-value">€{totalExclVat.toFixed(2)}</span>
                </div>
                <div className="order-totals-row">
                  <span className="order-totals-label">VAT ({vatPct}%)</span>
                  <span className="order-totals-value">€{vatAmount.toFixed(2)}</span>
                </div>
                <div className="order-totals-row">
                  <span className="order-totals-label">Shipping</span>
                  <span className="order-totals-value">
                    €{effectiveShipping.toFixed(2)}
                    {freeShippingApplied && (
                      <span className="order-free-shipping-badge">FREE SHIPPING</span>
                    )}
                  </span>
                </div>
                <div className="order-totals-total-row">
                  <span>Total incl. VAT</span>
                  <span>€{totalInclVat.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="order-form-nav">
            {step > 1 && (
              <button
                type="button"
                className="exact-btn exact-btn-outline"
                onClick={() => setStep((s) => s - 1)}
                disabled={isPending}
              >
                Back
              </button>
            )}
            {step < 3 && (
              <button
                type="button"
                className="exact-btn exact-btn-primary"
                onClick={goNext}
                disabled={isPending}
              >
                Next
              </button>
            )}
            {step === 3 && (
              <button
                type="submit"
                className="exact-btn exact-btn-primary"
                disabled={isPending}
              >
                {isPending
                  ? isEdit
                    ? 'Saving…'
                    : 'Creating…'
                  : isEdit
                    ? 'Save Changes'
                    : 'Confirm & Create'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
