import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const UpdateLineItemSchema = z.object({
  quantity: z.number().int().min(1).optional(),
  unitPrice: z.number().positive().optional(),
  discount: z.number().min(0).max(100).optional(),
});

export class UpdateLineItemDto extends createZodDto(UpdateLineItemSchema) {}
