import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { ExactModule } from '../exact/exact.module';
import { CategoriesService } from './categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), ExactModule],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
