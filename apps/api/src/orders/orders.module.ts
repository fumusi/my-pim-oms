import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { LineItem } from './entities/line-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, LineItem])],
  exports: [TypeOrmModule],
})
export class OrdersModule {}
