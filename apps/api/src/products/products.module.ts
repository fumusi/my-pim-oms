import { Module } from '@nestjs/common';
import { ExactModule } from '../exact/exact.module';
import { ProductsController } from './products.controller';

@Module({
  imports: [ExactModule],
  controllers: [ProductsController],
})
export class ProductsModule {}
