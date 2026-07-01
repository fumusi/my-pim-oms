import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const FindProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  categoryId: z.coerce.number().int().min(1).optional(),
  inStock: z.enum(['in_stock', 'out_of_stock', 'low_stock']).optional(),
  lang: z.enum(['nl', 'en', 'de']).optional(),
});

export class FindProductsQueryDto extends createZodDto(
  FindProductsQuerySchema,
) {}
