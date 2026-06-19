import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExactItem } from '../exact/entities/exact-item.entity';

@Controller('products')
export class ProductsController {
  constructor(
    @InjectRepository(ExactItem)
    private readonly repo: Repository<ExactItem>,
  ) {}

  @Get()
  findAll() {
    return this.repo.find({
      relations: { itemGroup: true },
      order: { description: 'ASC' },
    });
  }
}
