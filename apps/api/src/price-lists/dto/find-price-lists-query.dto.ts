import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { PriceListStatus } from '../../common/enums/price-list-status.enum';

const FindPriceListsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: z.nativeEnum(PriceListStatus).optional(),
  activeNow: z.coerce.boolean().optional(),
  archived: z.coerce.boolean().default(false),
}).refine(
  (d) => !(d.activeNow === true && d.status === PriceListStatus.Inactive),
  { message: 'activeNow=true is incompatible with status=inactive' },
);

export class FindPriceListsQueryDto extends createZodDto(FindPriceListsQuerySchema) {}
