import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { Contact } from './entities/contact.entity';
import { Address } from './entities/address.entity';
import { User } from '../users/entities/user.entity';
import { CustomerPriceList } from '../price-lists/entities/customer-price-list.entity';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomersScheduleService } from './customers-schedule.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      Contact,
      Address,
      User,
      CustomerPriceList,
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService, CustomersScheduleService],
  exports: [CustomersService],
})
export class CustomersModule {}
