import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { PriceListStatus } from '../../common/enums/price-list-status.enum';

const UpdatePriceListSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.nativeEnum(PriceListStatus).optional(),
});

export class UpdatePriceListDto extends createZodDto(UpdatePriceListSchema) {}
