import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// ExactItem uses UUID as primary key — productIds are UUID strings, not numbers.
const AssignProductsSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
});

export class AssignProductsDto extends createZodDto(AssignProductsSchema) {}
