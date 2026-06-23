import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { ProductStatus } from '../../common/enums/product-status.enum';
import { MailService } from '../../mail/mail.service';

const NOTIFICATION_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class StockNotificationService {
  private readonly logger = new Logger(StockNotificationService.name);

  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly mailService: MailService,
  ) {}

  async checkAndNotify(): Promise<void> {
    const adminEmails = await this.getAdminEmails();
    if (adminEmails.length === 0) {
      this.logger.warn('No active admins found — skipping stock notifications');
      return;
    }

    const [lowStock, outOfStock] = await Promise.all([
      this.findLowStockCandidates(),
      this.findOutOfStockCandidates(),
    ]);

    if (lowStock.length > 0) {
      await this.mailService.sendLowStockAlert(adminEmails, lowStock);
      const now = new Date();
      await this.productRepo.save(lowStock.map((p) => ({ ...p, lastLowStockNotifiedAt: now })));
      this.logger.log(`Low-stock notification sent for ${lowStock.length} product(s)`);
    }

    if (outOfStock.length > 0) {
      await this.mailService.sendOutOfStockAlert(adminEmails, outOfStock);
      const now = new Date();
      await this.productRepo.save(outOfStock.map((p) => ({ ...p, lastOutOfStockNotifiedAt: now })));
      this.logger.log(`Out-of-stock notification sent for ${outOfStock.length} product(s)`);
    }
  }

  private async findLowStockCandidates(): Promise<Product[]> {
    const cooldownCutoff = new Date(Date.now() - NOTIFICATION_COOLDOWN_MS);
    return this.productRepo
      .createQueryBuilder('p')
      .where('p.archivedAt IS NULL')
      .andWhere('p.status = :status', { status: ProductStatus.Active })
      .andWhere('p.lowStockThreshold IS NOT NULL')
      .andWhere('p.stock IS NOT NULL')
      .andWhere('p.stock >= 0')
      .andWhere('p.stock < p.lowStockThreshold')
      .andWhere(
        '(p.lastLowStockNotifiedAt IS NULL OR p.lastLowStockNotifiedAt < :cutoff)',
        { cutoff: cooldownCutoff },
      )
      .getMany();
  }

  private async findOutOfStockCandidates(): Promise<Product[]> {
    const cooldownCutoff = new Date(Date.now() - NOTIFICATION_COOLDOWN_MS);
    return this.productRepo
      .createQueryBuilder('p')
      .where('p.archivedAt IS NULL')
      .andWhere('p.status = :status', { status: ProductStatus.Active })
      .andWhere('(p.stock IS NULL OR p.stock = 0)')
      .andWhere(
        '(p.lastOutOfStockNotifiedAt IS NULL OR p.lastOutOfStockNotifiedAt < :cutoff)',
        { cutoff: cooldownCutoff },
      )
      .getMany();
  }

  private async getAdminEmails(): Promise<string[]> {
    const admins = await this.userRepo.findBy({ role: Role.Admin, isActive: true });
    return admins.map((u) => u.email);
  }
}
