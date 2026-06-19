import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { ExactItem } from '../exact/entities/exact-item.entity';
import { CategoriesService } from './categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([Category, ExactItem])],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
