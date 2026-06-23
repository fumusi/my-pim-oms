import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ProductStatus } from '../../common/enums/product-status.enum';

const idsSchema = z.array(z.number().int().min(1)).min(1).max(100);

export const BulkArchiveSchema = z.object({ ids: idsSchema });
export class BulkArchiveDto extends createZodDto(BulkArchiveSchema) {}

export const BulkStatusSchema = z.object({
  ids: idsSchema,
  status: z.enum(ProductStatus),
});
export class BulkStatusDto extends createZodDto(BulkStatusSchema) {}

export const BulkDeleteSchema = z.object({ ids: idsSchema });
export class BulkDeleteDto extends createZodDto(BulkDeleteSchema) {}
