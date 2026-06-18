import { api } from './client'

export type ExactConnectionStatus = 'connected' | 'unauthorized' | 'disconnected'

export interface SyncSummary {
  synced: number
  created: number
  updated: number
}

export const getExactStatus = () =>
  api.get<{ status: ExactConnectionStatus }>('/exact-online/status')

export const getExactAuthorizeUrl = () =>
  api.get<{ url: string }>('/exact-online/authorize')

export const syncExactProducts = () =>
  api.post<SyncSummary>('/exact-online/sync/products')
