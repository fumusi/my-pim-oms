import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const CreateItemSchema = z.object({
  description: z.string().min(1),
  code: z.string().optional(),
  standardSalesPrice: z.number().positive().optional(),
  categoryId: z.number().int().positive().optional(),
});

export class CreateItemDto extends createZodDto(CreateItemSchema) {}
