import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PriceListsService } from './price-lists.service';

@Injectable()
export class PriceListsScheduleService {
  private readonly logger = new Logger(PriceListsScheduleService.name);

  constructor(private readonly service: PriceListsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async deactivateExpiredPriceLists(): Promise<void> {
    this.logger.log('Running price list expiry check...');
    const { deactivated } = await this.service.deactivateExpiredPriceLists();
    this.logger.log(`Price list expiry check done — deactivated ${deactivated}`);
  }
}
