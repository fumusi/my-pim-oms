import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CategoryStatus } from '../common/enums/category-status.enum';
import type { AuthRequest } from '../common/types/auth-request.type';
import type { LocalizedText } from '../common/types/localized-text.interface';
import { CategoriesService, CategoryWithCount, CategoryDetail } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { StatusDto } from './dto/status.dto';
import { AssignProductsDto } from './dto/assign-products.dto';

// Query param DTOs — defined inline since they are not shared.
const ListQuerySchema = z.object({
  lang: z.enum(['nl', 'en', 'de']).optional(),
  status: z.enum(CategoryStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
class ListQueryDto extends createZodDto(ListQuerySchema) {}

const DetailQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});
class DetailQueryDto extends createZodDto(DetailQuerySchema) {}


function flattenLang(
  item: CategoryWithCount | CategoryDetail,
  lang: 'nl' | 'en' | 'de',
) {
  const { name, description, ...rest } = item;
  const n = name as LocalizedText;
  const d = description as LocalizedText | null;
  return {
    ...rest,
    name: n[lang] ?? n.nl ?? n.en ?? n.de ?? '',
    description: d ? (d[lang] ?? d.nl ?? d.en ?? d.de ?? null) : null,
  };
}

function stripTemplate<T extends { template?: unknown }>(item: T): Omit<T, 'template'> {
  const { template: _, ...rest } = item;
  return rest as Omit<T, 'template'>;
}

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ── GET /categories ────────────────────────────────────────────────────────────

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() query: ListQueryDto, @Req() req: AuthRequest) {
    const isAdmin = req.user.role === Role.Admin;
    // Non-admin always sees active only; admin can filter or sees all non-archived.
    const statusFilter = isAdmin ? query.status : CategoryStatus.Active;
    const categories = await this.categoriesService.findAll(statusFilter);

    const result: unknown[] = isAdmin ? categories : categories.map(stripTemplate);

    if (query.lang) {
      const lang = query.lang as 'nl' | 'en' | 'de';
      return (result as CategoryWithCount[]).map((c) => flattenLang(c, lang));
    }

    return result;
  }

  // ── GET /categories/:id ────────────────────────────────────────────────────────

  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get category detail with products' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Category detail' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: DetailQueryDto,
    @Req() req: AuthRequest,
  ) {
    const detail = await this.categoriesService.findOneDetail(id, query.page, query.limit, query.search);
    if (!detail) throw new NotFoundException(`Category ${id} not found`);

    const isAdmin = req.user.role === Role.Admin;
    if (!isAdmin) {
      if (detail.status !== CategoryStatus.Active || detail.archivedAt) {
        throw new NotFoundException(`Category ${id} not found`);
      }
      return stripTemplate(detail);
    }
    return detail;
  }

  // ── POST /categories ───────────────────────────────────────────────────────────

  @Post()
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create category (admin)' })
  @ApiResponse({ status: 201, description: 'Category created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() dto: CreateCategoryDto, @Req() req: AuthRequest) {
    return this.categoriesService.create(dto, req.user.email);
  }

  // ── PATCH /categories/:id ──────────────────────────────────────────────────────

  @Patch(':id')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update category (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Category updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @Req() req: AuthRequest,
  ) {
    return this.categoriesService.update(id, dto, req.user.email);
  }

  // ── PATCH /categories/:id/status ──────────────────────────────────────────────

  @Patch(':id/status')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update category status (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Category status updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StatusDto,
    @Req() req: AuthRequest,
  ) {
    return this.categoriesService.setStatus(id, dto.status, req.user.email);
  }

  // ── PATCH /categories/:id/archive ─────────────────────────────────────────────

  @Patch(':id/archive')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Archive category (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Category archived' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  archive(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.categoriesService.archive(id, req.user.email);
  }

  // ── DELETE /categories/:id ─────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete category (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Category deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    await this.categoriesService.delete(id, req.user.email);
  }

  // ── POST /categories/:id/assign ────────────────────────────────────────────────

  @Post(':id/assign')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Assign products to category (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Products assigned' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  assignProducts(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignProductsDto) {
    return this.categoriesService.assignProducts(id, dto.productIds);
  }

  // ── POST /categories/:id/unassign ─────────────────────────────────────────────

  @Post(':id/unassign')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Unassign products from category (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Products unassigned' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  unassignProducts(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignProductsDto) {
    return this.categoriesService.unassignProducts(id, dto.productIds);
  }
}
