import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceList } from './entities/price-list.entity';
import { PriceListItem } from './entities/price-list-item.entity';
import { CustomerPriceList } from './entities/customer-price-list.entity';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';
import { PriceListsController } from './price-lists.controller';
import { PriceListsService } from './price-lists.service';
import { PriceListsScheduleService } from './price-lists-schedule.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PriceList, PriceListItem, CustomerPriceList, Product, Customer]),
  ],
  controllers: [PriceListsController],
  providers: [PriceListsService, PriceListsScheduleService],
  exports: [PriceListsService],
})
export class PriceListsModule {}
