import {
  BadRequestException,
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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
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

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List products' })
  @ApiResponse({ status: 200, description: 'List of products' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() query: FindProductsQueryDto) {
    const result = await this.productsService.findAll(query);
    if (query.lang) {
      return { ...result, data: result.data.map((p) => this.flattenLang(p, query.lang!)) };
    }
    return result;
  }

  @Post()
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create product (admin)' })
  @ApiResponse({ status: 201, description: 'Product created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() dto: CreateProductDto, @Req() req: AuthRequest) {
    return this.productsService.create(dto, req.user.email);
  }

  @Get('import/template')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Download product import CSV template' })
  @ApiResponse({ status: 200, description: 'CSV template file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getImportTemplate(@Res() res: Response) {
    const buffer = this.productsService.getImportTemplate();
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="products-import-template.csv"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('export')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Export products as CSV' })
  @ApiResponse({ status: 200, description: 'CSV export file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportProducts(@Query() query: FindProductsQueryDto, @Req() req: AuthRequest, @Res() res: Response) {
    const isAdmin = req.user.role === Role.Admin;
    const buffer = await this.productsService.exportProducts(query, isAdmin);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="products-export.csv"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post('import')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Import products from CSV (admin)' })
  @ApiResponse({ status: 200, description: 'Import result' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  importProducts(@UploadedFile() file: Express.Multer.File, @Req() req: AuthRequest) {
    if (!file) throw new BadRequestException('File is required');
    return this.productsService.importProducts(file.buffer, file.mimetype, req.user.email);
  }

  @Patch('bulk/archive')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Bulk archive products (admin)' })
  @ApiResponse({ status: 200, description: 'Products archived' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  bulkArchive(@Body() dto: BulkArchiveDto) {
    return this.productsService.bulkArchive(dto.ids);
  }

  @Patch('bulk/status')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Bulk update product status (admin)' })
  @ApiResponse({ status: 200, description: 'Products status updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  bulkUpdateStatus(@Body() dto: BulkStatusDto) {
    return this.productsService.bulkUpdateStatus(dto.ids, dto.status);
  }

  @Delete('bulk')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Bulk delete products (admin)' })
  @ApiResponse({ status: 200, description: 'Products deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  bulkRemove(@Body() dto: BulkDeleteDto) {
    return this.productsService.bulkRemove(dto.ids);
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Product detail' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
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
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update product (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Product updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
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
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete product (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Product deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }

  @Patch(':id/archive')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Archive product (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Product archived' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.archive(id);
  }

  @Patch(':id/status')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update product status (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Product status updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
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
