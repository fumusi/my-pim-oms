import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const FindProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  excludeCategoryId: z.coerce.number().int().min(1).optional(),
  search: z.string().max(200).optional(),
  withCategory: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

export class FindProductsQueryDto extends createZodDto(FindProductsQuerySchema) {}
