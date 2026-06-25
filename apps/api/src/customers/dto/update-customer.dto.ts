import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CustomerStatus } from '../../common/enums/customer-status.enum';

const UpdateCustomerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  companyName: z.string().max(255).nullable().optional(),
  email: z.string().email().max(255).optional(),
  phoneNumber: z.string().max(50).nullable().optional(),
  country: z.string().min(1).optional(),
  vatNumber: z.string().max(50).nullable().optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  endDate: z.string().date().nullable().optional(),
});

export class UpdateCustomerDto extends createZodDto(UpdateCustomerSchema) {}
