import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CategoryStatus } from '../../common/enums/category-status.enum';

const localizedTextSchema = z.object({ nl: z.string(), en: z.string(), de: z.string() });

export const CreateCategorySchema = z.object({
  name: localizedTextSchema,
  description: localizedTextSchema.nullable().optional(),
  image: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  status: z.enum(CategoryStatus).optional(),
  template: z.record(z.string(), z.unknown()).nullable().optional(),
});

export class CreateCategoryDto extends createZodDto(CreateCategorySchema) {}
