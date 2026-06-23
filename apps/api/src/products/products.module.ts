import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExactModule } from '../exact/exact.module';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), ExactModule],
  controllers: [ProductsController],
})
export class ProductsModule {}
