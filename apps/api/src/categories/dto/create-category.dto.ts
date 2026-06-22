import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CategoryStatus } from '../../common/enums/category-status.enum';

const localizedTextSchema = z
  .object({ nl: z.string().optional(), en: z.string().optional(), de: z.string().optional() })
  .refine((val) => val.nl || val.en || val.de, {
    message: 'At least one language (nl, en, de) is required',
  });

export const CreateCategorySchema = z.object({
  name: localizedTextSchema,
  description: localizedTextSchema.nullable().optional(),
  image: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  status: z.enum(CategoryStatus).optional(),
  template: z.record(z.string(), z.unknown()).nullable().optional(),
});

export class CreateCategoryDto extends createZodDto(CreateCategorySchema) {}
