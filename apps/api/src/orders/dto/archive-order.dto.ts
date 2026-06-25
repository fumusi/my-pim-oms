import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const ArchiveOrderSchema = z.object({
  archiveReason: z.string().min(1).max(500),
});

export class ArchiveOrderDto extends createZodDto(ArchiveOrderSchema) {}
