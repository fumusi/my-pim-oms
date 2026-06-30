import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthRequest } from '../common/types/auth-request.type';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdatePimTemplateDto } from './dto/update-pim-template.dto';
import { FindAllItemsQueryDto } from './dto/find-all-items-query.dto';

@ApiTags('Items (Exact)')
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List Exact Online items' })
  @ApiResponse({ status: 200, description: 'List of items' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() query: FindAllItemsQueryDto) {
    return this.itemsService.findAll(query.page, query.limit, query.excludeCategoryId, query.search, query.withCategory);
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get Exact item by ID' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Item detail' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  findById(@Param('id') id: string) {
    return this.itemsService.findById(id);
  }

  @Post()
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create Exact item (admin)' })
  @ApiResponse({ status: 201, description: 'Item created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() dto: CreateItemDto, @Req() req: AuthRequest) {
    return this.itemsService.create(dto, req.user.email);
  }

  @Patch(':id/pim')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update PIM template for item (admin)' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'PIM template updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  updatePimTemplate(@Param('id') id: string, @Body() dto: UpdatePimTemplateDto, @Req() req: AuthRequest) {
    return this.itemsService.updatePimTemplate(id, dto, req.user.email);
  }
}
