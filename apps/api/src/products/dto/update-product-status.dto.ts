import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ProductStatus } from '../../common/enums/product-status.enum';

const UpdateProductStatusSchema = z.object({
  status: z.enum(ProductStatus),
});

export class UpdateProductStatusDto extends createZodDto(UpdateProductStatusSchema) {}
