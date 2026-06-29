import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const AssignCustomerSchema = z.object({
  customerId: z.number().int().positive(),
});

export class AssignCustomerDto extends createZodDto(AssignCustomerSchema) {}
