import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { DeliveryOption } from '../../common/enums/delivery-option.enum';

const CreateLineItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().positive(),
  discount: z.number().min(0).max(100).default(0),
});

export const CreateOrderSchema = z.object({
  customerId: z.number().int().positive(),
  shippingAddressId: z.number().int().positive(),
  deliveryOption: z.nativeEnum(DeliveryOption),
  description: z.string().max(1000).nullable().optional(),
  vatPercentage: z.number().min(0).max(100).nullable().optional(),
  lineItems: z.array(CreateLineItemSchema).min(1),
});

export class CreateOrderDto extends createZodDto(CreateOrderSchema) {}
export class CreateLineItemDto extends createZodDto(CreateLineItemSchema) {}
