import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { DeliveryOption } from '../../common/enums/delivery-option.enum';

const CreateLineItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1),
  discount: z.number().min(0).max(100).default(0),
});

export const CreateOrderSchema = z.object({
  customerId: z.number().int().positive().optional(),
  shippingAddressId: z.number().int().positive().optional(),
  deliveryOption: z.nativeEnum(DeliveryOption),
  description: z.string().max(1000).nullable().optional(),
  vatPercentage: z.number().min(0).max(100).nullable().optional(),
  shippingCost: z.number().min(0).default(0),
  lineItems: z.array(CreateLineItemSchema).min(1),
  onBehalfOf: z.string().email().optional(),
  newAddress: z.object({
    street: z.string().min(1),
    houseNumber: z.string().min(1),
    postalCode: z.string().min(1),
    city: z.string().min(1),
    province: z.string().optional(),
    country: z.string().min(1),
  }).optional(),
});

export class CreateOrderDto extends createZodDto(CreateOrderSchema) {}
export class CreateLineItemDto extends createZodDto(CreateLineItemSchema) {}
