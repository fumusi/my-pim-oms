import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { DeliveryOption } from '../../common/enums/delivery-option.enum';

const UpdateItemSchema = z.object({
  id: z.number().int().positive(),
  quantity: z.number().int().min(1).optional(),
  discount: z.number().min(0).max(100).optional(),
});

const AddItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1),
  discount: z.number().min(0).max(100).default(0),
});

const BulkEditOrderSchema = z.object({
  description: z.string().max(1000).nullable().optional(),
  deliveryOption: z.nativeEnum(DeliveryOption).optional(),
  trackingUrl: z.string().url().max(2048).nullable().optional(),
  shippingAddressId: z.number().int().positive().optional(),
  shippingCost: z.number().min(0).optional(),
  removeItemIds: z.array(z.number().int().positive()).optional(),
  updateItems: z.array(UpdateItemSchema).optional(),
  addItems: z.array(AddItemSchema).optional(),
});

export class BulkEditOrderDto extends createZodDto(BulkEditOrderSchema) {}
