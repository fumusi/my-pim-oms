import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const UpdatePriceListItemSchema = z.object({
  customPrice: z.number().positive().optional(),
  discount: z.number().min(0).max(100).nullable().optional(),
});

export class UpdatePriceListItemDto extends createZodDto(
  UpdatePriceListItemSchema,
) {}
