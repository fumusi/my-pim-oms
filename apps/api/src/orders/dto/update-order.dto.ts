import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { DeliveryOption } from '../../common/enums/delivery-option.enum';

const UpdateOrderSchema = z.object({
  description: z.string().max(1000).nullable().optional(),
  deliveryOption: z.nativeEnum(DeliveryOption).optional(),
  trackingUrl: z.string().url().max(2048).nullable().optional(),
  shippingAddressId: z.number().int().positive().optional(),
  shippingCost: z.number().min(0).optional(),
});

export class UpdateOrderDto extends createZodDto(UpdateOrderSchema) {}
