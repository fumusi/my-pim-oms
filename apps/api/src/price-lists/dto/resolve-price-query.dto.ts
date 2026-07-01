import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const ResolvePriceQuerySchema = z.object({
  productId: z.coerce.number().int().positive(),
  customerId: z.coerce.number().int().positive().optional(),
});

export class ResolvePriceQueryDto extends createZodDto(
  ResolvePriceQuerySchema,
) {}
