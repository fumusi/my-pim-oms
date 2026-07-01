import { api } from './client'

export type AuditAction = 'create' | 'update' | 'delete' | 'archive' | 'status_change'

export interface AuditLog {
  id: number
  entityType: string
  entityId: number
  action: AuditAction
  changedFields: Record<string, { old: unknown; new: unknown }> | null
  performedBy: string
  performedAt: string
  metadata: Record<string, unknown> | null
}

export interface AuditLogsResponse {
  data: AuditLog[]
  total: number
  page: number
  limit: number
}

export interface AuditLogsQuery {
  entityType?: string
  entityId?: number
  action?: AuditAction
  performedBy?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export const getAuditLogs = (query: AuditLogsQuery): Promise<AuditLogsResponse> =>
  api.get<AuditLogsResponse>('/audit-logs', { params: query }).then((r) => r.data)

export const getEntityHistory = (entityType: string, entityId: number): Promise<AuditLog[]> =>
  api.get<AuditLog[]>(`/audit-logs/entity/${entityType}/${entityId}`).then((r) => r.data)
