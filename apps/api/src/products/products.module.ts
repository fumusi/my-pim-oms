import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExactItem } from '../exact/entities/exact-item.entity';
import { ProductsController } from './products.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ExactItem])],
  controllers: [ProductsController],
})
export class ProductsModule {}
