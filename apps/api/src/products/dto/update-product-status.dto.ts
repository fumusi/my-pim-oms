import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ProductStatus } from '../../common/enums/product-status.enum';

const UpdateProductStatusSchema = z.object({
  status: z.nativeEnum(ProductStatus),
});

export class UpdateProductStatusDto extends createZodDto(UpdateProductStatusSchema) {}
