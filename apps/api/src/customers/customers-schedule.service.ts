import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CustomersService } from './customers.service';

@Injectable()
export class CustomersScheduleService {
  private readonly logger = new Logger(CustomersScheduleService.name);

  constructor(private readonly service: CustomersService) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async deactivateExpiredCustomers(): Promise<void> {
    this.logger.log('Running customer endDate expiry check...');
    const { deactivated } = await this.service.deactivateExpiredCustomers();
    this.logger.log(`Customer endDate check complete — deactivated ${deactivated} customer(s)`);
  }
}
