import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthRequest } from '../common/types/auth-request.type';
import { ProductsService } from './products.service';
import { FindProductsQueryDto } from './dto/find-products-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductQueryDto } from './dto/get-product-query.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { BulkArchiveDto, BulkDeleteDto, BulkStatusDto } from './dto/bulk-action.dto';
import type { Product } from './entities/product.entity';
import type { LocalizedText } from '../common/types/localized-text.interface';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Query() query: FindProductsQueryDto) {
    const result = await this.productsService.findAll(query);
    if (query.lang) {
      return { ...result, data: result.data.map((p) => this.flattenLang(p, query.lang!)) };
    }
    return result;
  }

  @Post()
  @Roles(Role.Admin)
  create(@Body() dto: CreateProductDto, @Req() req: AuthRequest) {
    return this.productsService.create(dto, req.user.email);
  }

  @Patch('bulk/archive')
  @Roles(Role.Admin)
  bulkArchive(@Body() dto: BulkArchiveDto) {
    return this.productsService.bulkArchive(dto.ids);
  }

  @Patch('bulk/status')
  @Roles(Role.Admin)
  bulkUpdateStatus(@Body() dto: BulkStatusDto) {
    return this.productsService.bulkUpdateStatus(dto.ids, dto.status);
  }

  @Delete('bulk')
  @Roles(Role.Admin)
  bulkRemove(@Body() dto: BulkDeleteDto) {
    return this.productsService.bulkRemove(dto.ids);
  }

  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetProductQueryDto,
  ) {
    const product = await this.productsService.findById(id);
    if (query.lang) return this.flattenLang(product, query.lang);
    return product;
  }

  @Patch(':id')
  @Roles(Role.Admin)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @Req() req: AuthRequest,
  ) {
    return this.productsService.update(id, dto, req.user.email);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }

  @Patch(':id/archive')
  @Roles(Role.Admin)
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.archive(id);
  }

  @Patch(':id/status')
  @Roles(Role.Admin)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this.productsService.updateStatus(id, dto.status);
  }

  private flattenLang(product: Product, lang: string): object {
    const pick = (text: LocalizedText | null | undefined): string | null =>
      text ? (text[lang as keyof LocalizedText] ?? null) : null;

    return { ...product, name: pick(product.name), description: pick(product.description) };
  }
}
