import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Order } from './entities/order.entity';
import { LineItem } from './entities/line-item.entity';
import { Product } from '../products/entities/product.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderCalculationService } from './order-calculation.service';
import { OrderInvoiceService } from './order-invoice.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Order, LineItem, Product])],
  controllers: [OrdersController],
  providers: [OrdersService, OrderCalculationService, OrderInvoiceService],
  exports: [TypeOrmModule],
})
export class OrdersModule {}
