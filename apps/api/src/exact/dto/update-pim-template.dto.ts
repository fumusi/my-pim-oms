import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const UpdatePimTemplateSchema = z.object({
  pimTemplate: z.record(z.string(), z.unknown()),
});

export class UpdatePimTemplateDto extends createZodDto(UpdatePimTemplateSchema) {}
