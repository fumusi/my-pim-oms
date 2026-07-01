import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { NotificationType } from '../common/enums/notification-type.enum';
import { Role } from '../common/enums/role.enum';
import type { FindNotificationsQueryDto } from './dto/find-notifications-query.dto';

export interface PaginatedNotifications {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async notifyAdmins(
    type: NotificationType,
    title: string,
    message: string,
    relatedEntityType?: string,
    relatedEntityId?: number,
  ): Promise<void> {
    try {
      const admins = await this.userRepo.findBy({
        role: Role.Admin,
        isActive: true,
      });
      if (admins.length === 0) return;

      const notifications = admins.map((admin) =>
        this.repo.create({
          type,
          title,
          message,
          relatedEntityType: relatedEntityType ?? null,
          relatedEntityId: relatedEntityId ?? null,
          recipientId: admin.id,
          isRead: false,
        }),
      );
      await this.repo.save(notifications);
    } catch (err) {
      this.logger.error(
        `Failed to notify admins [${type}]: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async findAll(
    recipientId: number,
    query: FindNotificationsQueryDto,
  ): Promise<PaginatedNotifications> {
    const { page, limit } = query;

    const qb = this.repo
      .createQueryBuilder('n')
      .where('n.recipientId = :recipientId', { recipientId })
      .orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.isRead !== undefined) {
      qb.andWhere('n.isRead = :isRead', { isRead: query.isRead });
    }

    if (query.type) {
      qb.andWhere('n.type = :type', { type: query.type });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getUnreadCount(recipientId: number): Promise<number> {
    return this.repo.countBy({ recipientId, isRead: false });
  }

  async markRead(id: number, recipientId: number): Promise<void> {
    const notification = await this.repo.findOneBy({ id, recipientId });
    if (!notification)
      throw new NotFoundException(`Notification ${id} not found`);
    notification.isRead = true;
    await this.repo.save(notification);
  }

  async markAllRead(recipientId: number): Promise<void> {
    await this.repo.update({ recipientId, isRead: false }, { isRead: true });
  }
}
