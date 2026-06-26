import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { DeliveryOption } from '../../common/enums/delivery-option.enum';

const FindOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: z.nativeEnum(OrderStatus).optional(),
  customerId: z.coerce.number().int().positive().optional(),
  deliveryOption: z.nativeEnum(DeliveryOption).optional(),
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo: z.string().datetime({ offset: true }).optional(),
  archived: z.coerce.boolean().default(false),
});

export class FindOrdersQueryDto extends createZodDto(FindOrdersQuerySchema) {}
