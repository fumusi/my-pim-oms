import { Controller, Get, Query } from '@nestjs/common';
import { ItemsService } from '../exact/items.service';
import { FindProductsQueryDto } from './dto/find-products-query.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  findAll(@Query() query: FindProductsQueryDto) {
    return this.itemsService.findAll(
      query.page,
      query.limit,
      query.excludeCategoryId,
      query.search,
      query.withCategory,
    );
  }
}
