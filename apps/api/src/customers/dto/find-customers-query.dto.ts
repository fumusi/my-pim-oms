import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const FindCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  country: z.string().optional(),
});

export class FindCustomersQueryDto extends createZodDto(
  FindCustomersQuerySchema,
) {}
