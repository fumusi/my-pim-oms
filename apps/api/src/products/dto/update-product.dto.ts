import { createZodDto } from 'nestjs-zod';
import { localizedTextSchema, CreateProductSchema } from './create-product.dto';

const UpdateProductSchema = CreateProductSchema.extend({
  name: localizedTextSchema.optional(),
});

export class UpdateProductDto extends createZodDto(UpdateProductSchema) {}
