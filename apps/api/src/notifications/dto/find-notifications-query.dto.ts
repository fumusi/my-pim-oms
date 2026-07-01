import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { NotificationType } from '../../common/enums/notification-type.enum';

const FindNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(15),
  isRead: z.coerce.boolean().optional(),
  type: z.nativeEnum(NotificationType).optional(),
});

export class FindNotificationsQueryDto extends createZodDto(
  FindNotificationsQuerySchema,
) {}
