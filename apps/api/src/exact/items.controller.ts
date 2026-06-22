import { Body, Controller, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdatePimTemplateDto } from './dto/update-pim-template.dto';

type AuthRequest = Request & { user: JwtPayload };

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @Roles(Role.Admin)
  create(@Body() dto: CreateItemDto, @Req() req: AuthRequest) {
    return this.itemsService.create(dto, req.user.email);
  }

  @Patch(':id/pim')
  @Roles(Role.Admin)
  updatePimTemplate(@Param('id') id: string, @Body() dto: UpdatePimTemplateDto) {
    return this.itemsService.updatePimTemplate(id, dto);
  }
}
