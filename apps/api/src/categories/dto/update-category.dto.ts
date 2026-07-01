import { createZodDto } from 'nestjs-zod';
import { CreateCategorySchema } from './create-category.dto';

export const UpdateCategorySchema = CreateCategorySchema.omit({
  status: true,
}).partial();

export class UpdateCategoryDto extends createZodDto(UpdateCategorySchema) {}
