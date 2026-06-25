import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { Contact } from './entities/contact.entity';
import { Address } from './entities/address.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Contact, Address])],
  exports: [TypeOrmModule],
})
export class CustomersModule {}
