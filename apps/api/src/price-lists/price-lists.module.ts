import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceList } from './entities/price-list.entity';
import { PriceListItem } from './entities/price-list-item.entity';
import { CustomerPriceList } from './entities/customer-price-list.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PriceList, PriceListItem, CustomerPriceList])],
})
export class PriceListsModule {}
