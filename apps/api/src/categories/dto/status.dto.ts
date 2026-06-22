import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CategoryStatus } from '../../common/enums/category-status.enum';

const StatusSchema = z.object({
  status: z.enum(CategoryStatus),
});

export class StatusDto extends createZodDto(StatusSchema) {}
