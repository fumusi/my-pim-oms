import { api } from './client'

export interface Contact {
  id: number
  customerId: number
  firstName: string
  lastName: string
  email: string | null
  phoneNumber: string | null
  isPrimary: boolean
}

export interface Address {
  id: number
  customerId: number
  street: string
  houseNumber: string
  postalCode: string
  city: string
  province: string | null
  country: string
  isPrimary: boolean
}

export type CustomerStatus = 'active' | 'inactive' | 'archived'

export interface Customer {
  id: number
  customerNumber: string
  name: string
  companyName: string | null
  email: string
  phoneNumber: string | null
  country: string
  vatNumber: string | null
  status: CustomerStatus
  endDate: string | null
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
  archivedAt: string | null
  contacts: Contact[]
  addresses: Address[]
}

export interface MemberUser {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
}

export interface CustomerDetail extends Customer {
  orderCount: number
  members: MemberUser[]
}

export interface PaginatedCustomers {
  data: Customer[]
  total: number
  page: number
  limit: number
}

export interface CustomersQuery {
  page?: number
  limit?: number
  search?: string
  status?: CustomerStatus
  country?: string
}

export interface CreateContactBody {
  firstName: string
  lastName: string
  email?: string | null
  phoneNumber?: string | null
  isPrimary?: boolean
}

export interface CreateAddressBody {
  street: string
  houseNumber: string
  postalCode: string
  city: string
  province?: string | null
  country: string
  isPrimary?: boolean
}

export interface CreateCustomerBody {
  name: string
  companyName?: string | null
  email: string
  phoneNumber?: string | null
  country: string
  vatNumber?: string | null
  status?: CustomerStatus
  endDate?: string | null
  addresses: CreateAddressBody[]
  contacts?: CreateContactBody[]
}

export interface UpdateCustomerBody {
  name?: string
  companyName?: string | null
  email?: string
  phoneNumber?: string | null
  country?: string
  vatNumber?: string | null
  status?: CustomerStatus
  endDate?: string | null
}

export const getCustomers = (q: CustomersQuery) =>
  api.get<PaginatedCustomers>('/customers', { params: q })

export const getCustomer = (id: number) =>
  api.get<CustomerDetail>(`/customers/${id}`)

export const createCustomer = (body: CreateCustomerBody) =>
  api.post<Customer>('/customers', body)

export const updateCustomer = (id: number, body: UpdateCustomerBody) =>
  api.patch<Customer>(`/customers/${id}`, body)

export const updateCustomerStatus = (id: number, status: CustomerStatus) =>
  api.patch<Customer>(`/customers/${id}/status`, { status })

export const deleteCustomer = (id: number) =>
  api.delete(`/customers/${id}`)

export const archiveCustomer = (id: number) =>
  api.patch<Customer>(`/customers/${id}/archive`)

export const createContact = (customerId: number, body: CreateContactBody) =>
  api.post<Contact>(`/customers/${customerId}/contacts`, body)

export const updateContact = (customerId: number, contactId: number, body: Partial<CreateContactBody>) =>
  api.patch<Contact>(`/customers/${customerId}/contacts/${contactId}`, body)

export const deleteContact = (customerId: number, contactId: number) =>
  api.delete(`/customers/${customerId}/contacts/${contactId}`)

export const setPrimaryContact = (customerId: number, contactId: number) =>
  api.patch<Contact>(`/customers/${customerId}/contacts/${contactId}/primary`)

export const createAddress = (customerId: number, body: CreateAddressBody) =>
  api.post<Address>(`/customers/${customerId}/addresses`, body)

export const updateAddress = (customerId: number, addressId: number, body: Partial<CreateAddressBody>) =>
  api.patch<Address>(`/customers/${customerId}/addresses/${addressId}`, body)

export const deleteAddress = (customerId: number, addressId: number) =>
  api.delete(`/customers/${customerId}/addresses/${addressId}`)

export const setPrimaryAddress = (customerId: number, addressId: number) =>
  api.patch<Address>(`/customers/${customerId}/addresses/${addressId}/primary`)

export interface CustomerPriceListItem {
  id: number
  productId: number
  customPrice: number
  discount: number | null
  effectivePrice: number
  product: {
    id: number
    name: { nl?: string; en?: string; de?: string } | null
    barcode: string | null
    basePrice: number | null
  } | null
}

export interface CustomerPriceList {
  id: number
  name: string
  status: string
  startDate: string | null
  endDate: string | null
  archivedAt: string | null
  assignedAt: string
  items: CustomerPriceListItem[]
}

export const getCustomerPriceList = (customerId: number) =>
  api.get<CustomerPriceList | null>(`/customers/${customerId}/price-list`).then((r) => r.data)
