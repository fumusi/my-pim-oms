import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { PriceListStatus } from '../../common/enums/price-list-status.enum';

const UpdatePriceListStatusSchema = z.object({
  status: z.nativeEnum(PriceListStatus),
});

export class UpdatePriceListStatusDto extends createZodDto(UpdatePriceListStatusSchema) {}
