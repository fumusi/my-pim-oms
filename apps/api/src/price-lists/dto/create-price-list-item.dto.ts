import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const CreatePriceListItemSchema = z.object({
  productId: z.number().int().positive(),
  customPrice: z.number().positive(),
  discount: z.number().min(0).max(100).optional(),
});

export class CreatePriceListItemDto extends createZodDto(
  CreatePriceListItemSchema,
) {}
