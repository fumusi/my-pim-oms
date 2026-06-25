import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { OrderStatus } from '../../common/enums/order-status.enum';

const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export class UpdateOrderStatusDto extends createZodDto(
  UpdateOrderStatusSchema,
) {}
