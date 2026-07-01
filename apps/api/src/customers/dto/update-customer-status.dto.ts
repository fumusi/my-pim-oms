import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CustomerStatus } from '../../common/enums/customer-status.enum';

const UpdateCustomerStatusSchema = z.object({
  status: z.nativeEnum(CustomerStatus),
});

export class UpdateCustomerStatusDto extends createZodDto(
  UpdateCustomerStatusSchema,
) {}
