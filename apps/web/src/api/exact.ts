import { api } from './client'

export type ExactConnectionStatus = 'connected' | 'unauthorized' | 'disconnected'

export interface SyncSummary {
  synced: number
  created: number
  updated: number
}

export type SyncJobStatus =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; result: SyncSummary }
  | { status: 'error'; error: string }

export const getExactStatus = () =>
  api.get<{ status: ExactConnectionStatus }>('/exact-online/status')

export const getExactAuthorizeUrl = () =>
  api.get<{ url: string }>('/exact-online/authorize')

export const startExactSync = () =>
  api.post<SyncJobStatus>('/exact-online/sync/products')

export const getExactSyncStatus = () =>
  api.get<SyncJobStatus>('/exact-online/sync/products/status')
