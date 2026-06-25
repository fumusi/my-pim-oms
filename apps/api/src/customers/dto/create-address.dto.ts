import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateAddressSchema = z.object({
  street: z.string().min(1).max(255),
  houseNumber: z.string().min(1).max(50),
  postalCode: z.string().min(1).max(20),
  city: z.string().min(1).max(100),
  province: z.string().max(100).nullable().optional(),
  country: z.string().min(1),
  isPrimary: z.boolean().optional(),
});

export class CreateAddressDto extends createZodDto(CreateAddressSchema) {}
