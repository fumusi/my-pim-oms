import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProductsService } from './products.service';
import { StockNotificationService } from './notification/stock-notification.service';

@Injectable()
export class ProductsScheduleService {
  private readonly logger = new Logger(ProductsScheduleService.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly stockNotificationService: StockNotificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async deactivateExpiredProducts(): Promise<void> {
    this.logger.log('Running endDate expiry check...');
    const { deactivated } =
      await this.productsService.deactivateExpiredProducts();
    this.logger.log(
      `endDate check complete — deactivated ${deactivated} product(s)`,
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runStockNotifications(): Promise<void> {
    this.logger.log('Running daily stock notification check...');
    await this.stockNotificationService.checkAndNotify();
    this.logger.log('Stock notification check complete');
  }
}
