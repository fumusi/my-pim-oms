import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsScheduleService } from './products-schedule.service';
import { StockNotificationService } from './notification/stock-notification.service';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { User } from '../users/entities/user.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, User]), MailModule],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    StockNotificationService,
    ProductsScheduleService,
  ],
  exports: [StockNotificationService, ProductsService],
})
export class ProductsModule {}
