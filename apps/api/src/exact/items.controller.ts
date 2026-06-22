import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdatePimTemplateDto } from './dto/update-pim-template.dto';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @Roles(Role.Admin)
  create(@Body() dto: CreateItemDto) {
    return this.itemsService.create(dto);
  }

  @Patch(':id/pim')
  @Roles(Role.Admin)
  updatePimTemplate(@Param('id') id: string, @Body() dto: UpdatePimTemplateDto) {
    return this.itemsService.updatePimTemplate(id, dto);
  }
}
