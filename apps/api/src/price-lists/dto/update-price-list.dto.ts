import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const UpdatePriceListSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .refine((d) => !d.startDate || !d.endDate || d.startDate <= d.endDate, {
    message: 'startDate must be before endDate',
  });

export class UpdatePriceListDto extends createZodDto(UpdatePriceListSchema) {}
