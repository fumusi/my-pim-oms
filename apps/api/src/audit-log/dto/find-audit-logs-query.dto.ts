import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const FindAuditLogsQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.coerce.number().int().positive().optional(),
  action: z.enum(['create', 'update', 'delete', 'archive', 'status_change']).optional(),
  performedBy: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export class FindAuditLogsQueryDto extends createZodDto(FindAuditLogsQuerySchema) {}
