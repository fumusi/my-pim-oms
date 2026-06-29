import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const CreatePriceListSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export class CreatePriceListDto extends createZodDto(CreatePriceListSchema) {}
