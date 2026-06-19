import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ItemsService } from '../exact/items.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.itemsService.findAll(page, limit);
  }
}
