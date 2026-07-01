import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const BulkAddItemsSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        customPrice: z.number().positive(),
        discount: z.number().min(0).max(100).optional(),
      }),
    )
    .min(1),
});

export class BulkAddItemsDto extends createZodDto(BulkAddItemsSchema) {}
