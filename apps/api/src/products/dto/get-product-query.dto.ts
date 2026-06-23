import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const GetProductQuerySchema = z.object({
  lang: z.enum(['nl', 'en', 'de']).optional(),
});

export class GetProductQueryDto extends createZodDto(GetProductQuerySchema) {}
