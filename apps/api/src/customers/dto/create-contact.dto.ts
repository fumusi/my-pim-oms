import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255).nullable().optional(),
  phoneNumber: z.string().max(50).nullable().optional(),
  isPrimary: z.boolean().optional(),
});

export class CreateContactDto extends createZodDto(CreateContactSchema) {}
