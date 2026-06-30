import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { PriceListsService } from './price-lists.service';
import { FindPriceListsQueryDto } from './dto/find-price-lists-query.dto';
import { ResolvePriceQueryDto } from './dto/resolve-price-query.dto';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { UpdatePriceListStatusDto } from './dto/update-price-list-status.dto';
import { CreatePriceListItemDto } from './dto/create-price-list-item.dto';
import { UpdatePriceListItemDto } from './dto/update-price-list-item.dto';
import { BulkAddItemsDto } from './dto/bulk-add-items.dto';
import { AssignCustomerDto } from './dto/assign-customer.dto';

@Controller('price-lists')
export class PriceListsController {
  constructor(private readonly service: PriceListsService) {}

  @Get()
  @Roles(Role.Admin, Role.User)
  findAll(@Query() query: FindPriceListsQueryDto, @Req() req: AuthRequest) {
    if (req.user.role !== Role.Admin && req.user.customerId == null) {
      throw new ForbiddenException('No customer account linked to this user');
    }
    const scopedCustomerId = req.user.role === Role.Admin ? undefined : req.user.customerId!;
    return this.service.findAll(query, scopedCustomerId);
  }

  @Get('resolve')
  @Roles(Role.Admin, Role.User)
  resolvePrice(@Query() query: ResolvePriceQueryDto, @Req() req: AuthRequest) {
    if (req.user.role !== Role.Admin && req.user.customerId == null) {
      throw new ForbiddenException('No customer account linked to this user');
    }
    const customerId =
      req.user.role === Role.Admin ? query.customerId : req.user.customerId!;
    return this.service.resolvePrice(query.productId, customerId);
  }

  @Get('assigned-customer-ids')
  @Roles(Role.Admin)
  getAssignedCustomerIds() {
    return this.service.getAssignedCustomerIds();
  }

  @Get(':id/customers')
  @Roles(Role.Admin)
  getAssignedCustomers(@Param('id', ParseIntPipe) id: number) {
    return this.service.getAssignedCustomers(id);
  }

  @Get(':id')
  @Roles(Role.Admin, Role.User)
  findById(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    if (req.user.role !== Role.Admin && req.user.customerId == null) {
      throw new ForbiddenException('No customer account linked to this user');
    }
    const scopedCustomerId = req.user.role === Role.Admin ? undefined : req.user.customerId!;
    return this.service.findById(id, scopedCustomerId);
  }

  @Post()
  @Roles(Role.Admin)
  create(@Body() dto: CreatePriceListDto, @Req() req: AuthRequest) {
    return this.service.create(dto, req.user.email);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePriceListDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.update(id, dto, req.user.email);
  }

  @Patch(':id/status')
  @Roles(Role.Admin)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePriceListStatusDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.updateStatus(id, dto.status, req.user.email);
  }

  @Patch(':id/archive')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  archive(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.archive(id, req.user.email);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }

  @Post(':id/items/bulk')
  @Roles(Role.Admin)
  bulkAddItems(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BulkAddItemsDto,
  ) {
    return this.service.bulkAddItems(id, dto);
  }

  @Post(':id/items')
  @Roles(Role.Admin)
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePriceListItemDto,
  ) {
    return this.service.addItem(id, dto);
  }

  @Patch(':id/items/:itemId')
  @Roles(Role.Admin)
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdatePriceListItemDto,
  ) {
    return this.service.updateItem(id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.service.removeItem(id, itemId);
  }

  @Post(':id/customers')
  @Roles(Role.Admin)
  assignCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignCustomerDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.assignCustomer(id, dto, req.user.email);
  }

  @Delete(':id/customers/:customerId')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  unassignCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Param('customerId', ParseIntPipe) customerId: number,
  ) {
    return this.service.unassignCustomer(id, customerId);
  }
}
