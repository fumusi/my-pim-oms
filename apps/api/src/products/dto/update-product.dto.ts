import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { localizedTextSchema, CreateProductSchema } from './create-product.dto';

const UpdateProductSchema = CreateProductSchema.extend({
  name: localizedTextSchema.optional(),
  // Allow null to explicitly clear the category (undefined = don't touch)
  categoryId: z.number().int().min(1).nullable().optional(),
});

export class UpdateProductDto extends createZodDto(UpdateProductSchema) {}
