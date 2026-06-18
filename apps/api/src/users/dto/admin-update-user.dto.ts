import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { Role } from '../../common/enums/role.enum';

const AdminUpdateUserSchema = z.object({
  email: z.string().email().optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
});

export class AdminUpdateUserDto extends createZodDto(AdminUpdateUserSchema) {}
