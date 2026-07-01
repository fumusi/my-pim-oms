import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { Role } from '../../common/enums/role.enum';

const FindUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  customerId: z.coerce.number().int().positive().optional(),
});

export class FindUsersQueryDto extends createZodDto(FindUsersQuerySchema) {}
