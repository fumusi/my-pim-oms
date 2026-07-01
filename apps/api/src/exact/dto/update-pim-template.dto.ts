import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const UpdatePimTemplateSchema = z.object({
  pimTemplate: z.record(z.string(), z.unknown()).nullable(),
});

export class UpdatePimTemplateDto extends createZodDto(
  UpdatePimTemplateSchema,
) {}
