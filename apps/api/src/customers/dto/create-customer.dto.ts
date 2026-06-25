import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CustomerStatus } from '../../common/enums/customer-status.enum';
import { CreateAddressSchema } from './create-address.dto';
import { CreateContactSchema } from './create-contact.dto';

export const CreateCustomerSchema = z.object({
  name: z.string().min(1).max(255),
  companyName: z.string().max(255).nullable().optional(),
  email: z.string().email().max(255),
  phoneNumber: z.string().max(50).nullable().optional(),
  country: z.string().min(1),
  vatNumber: z.string().max(50).nullable().optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  endDate: z.string().date().nullable().optional(),
  addresses: z.array(CreateAddressSchema).min(1),
  contacts: z.array(CreateContactSchema).max(10).optional(),
});

export class CreateCustomerDto extends createZodDto(CreateCustomerSchema) {}
