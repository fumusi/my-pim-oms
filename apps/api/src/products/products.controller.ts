import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ItemsService } from '../exact/items.service';

const FindProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  excludeCategoryId: z.coerce.number().int().min(1).optional(),
  search: z.string().optional(),
  withCategory: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});
class FindProductsQueryDto extends createZodDto(FindProductsQuerySchema) {}

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
