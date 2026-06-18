import { api } from './client'

export interface Product {
  id: string
  code: string | null
  description: string | null
  isSalesItem: boolean | null
  itemGroupDescription: string | null
  itemGroup: { id: string; description: string | null } | null
}

export const getProducts = () => api.get<Product[]>('/products')
