import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthRequest } from '../common/types/auth-request.type';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdatePimTemplateDto } from './dto/update-pim-template.dto';
import { FindAllItemsQueryDto } from './dto/find-all-items-query.dto';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  findAll(@Query() query: FindAllItemsQueryDto) {
    return this.itemsService.findAll(query.page, query.limit, query.excludeCategoryId, query.search, query.withCategory);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.itemsService.findById(id);
  }

  @Post()
  @Roles(Role.Admin)
  create(@Body() dto: CreateItemDto, @Req() req: AuthRequest) {
    return this.itemsService.create(dto, req.user.email);
  }

  @Patch(':id/pim')
  @Roles(Role.Admin)
  updatePimTemplate(@Param('id') id: string, @Body() dto: UpdatePimTemplateDto, @Req() req: AuthRequest) {
    return this.itemsService.updatePimTemplate(id, dto, req.user.email);
  }
}
