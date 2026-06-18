import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const UpdateMeSchema = z.object({
  email: z.string().email().optional(),
});

export class UpdateMeDto extends createZodDto(UpdateMeSchema) {}
