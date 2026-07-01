import { createZodDto } from 'nestjs-zod';
import { CreateAddressSchema } from './create-address.dto';

export class UpdateAddressDto extends createZodDto(
  CreateAddressSchema.partial(),
) {}
