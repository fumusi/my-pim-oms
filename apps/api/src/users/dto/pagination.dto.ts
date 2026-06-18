import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export class PaginationDto extends createZodDto(PaginationSchema) {}
