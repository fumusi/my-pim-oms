import {
  BadRequestException,
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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
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

@ApiTags('Price Lists')
@Controller('price-lists')
export class PriceListsController {
  constructor(private readonly service: PriceListsService) {}

  @Get()
  @Roles(Role.Admin, Role.User)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List price lists' })
  @ApiResponse({ status: 200, description: 'List of price lists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll(@Query() query: FindPriceListsQueryDto, @Req() req: AuthRequest) {
    if (req.user.role !== Role.Admin && req.user.customerId == null) {
      throw new ForbiddenException('No customer account linked to this user');
    }
    const scopedCustomerId = req.user.role === Role.Admin ? undefined : req.user.customerId!;
    return this.service.findAll(query, scopedCustomerId);
  }

  @Get('resolve')
  @Roles(Role.Admin, Role.User)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Resolve effective price for a product' })
  @ApiResponse({ status: 200, description: 'Resolved price' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  resolvePrice(@Query() query: ResolvePriceQueryDto, @Req() req: AuthRequest) {
    if (req.user.role !== Role.Admin && req.user.customerId == null) {
      throw new ForbiddenException('No customer account linked to this user');
    }
    const customerId =
      req.user.role === Role.Admin ? query.customerId : req.user.customerId!;
    if (customerId == null) {
      throw new BadRequestException('customerId is required');
    }
    return this.service.resolvePrice(query.productId, customerId);
  }

  @Get('assigned-customer-ids')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get IDs of customers with a price list (admin)' })
  @ApiResponse({ status: 200, description: 'Assigned customer IDs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getAssignedCustomerIds() {
    return this.service.getAssignedCustomerIds();
  }

  @Get(':id/customers')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get customers assigned to price list (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Assigned customers' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Price list not found' })
  getAssignedCustomers(@Param('id', ParseIntPipe) id: number) {
    return this.service.getAssignedCustomers(id);
  }

  @Get(':id')
  @Roles(Role.Admin, Role.User)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get price list by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Price list detail' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Price list not found' })
  findById(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    if (req.user.role !== Role.Admin && req.user.customerId == null) {
      throw new ForbiddenException('No customer account linked to this user');
    }
    const scopedCustomerId = req.user.role === Role.Admin ? undefined : req.user.customerId!;
    return this.service.findById(id, scopedCustomerId);
  }

  @Post()
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create price list (admin)' })
  @ApiResponse({ status: 201, description: 'Price list created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() dto: CreatePriceListDto, @Req() req: AuthRequest) {
    return this.service.create(dto, req.user.email);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update price list (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Price list updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Price list not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePriceListDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.update(id, dto, req.user.email);
  }

  @Patch(':id/status')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update price list status (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Price list status updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Price list not found' })
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
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Archive price list (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Price list archived' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Price list not found' })
  archive(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.archive(id, req.user.email);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete price list (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Price list deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Price list not found' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }

  @Post(':id/items/bulk')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Bulk add products to price list (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Products added to price list' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Price list not found' })
  bulkAddItems(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BulkAddItemsDto,
  ) {
    return this.service.bulkAddItems(id, dto);
  }

  @Post(':id/items')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add product to price list (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, description: 'Product added to price list' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Price list not found' })
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePriceListItemDto,
  ) {
    return this.service.addItem(id, dto);
  }

  @Patch(':id/items/:itemId')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update price list item (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'itemId', type: Number })
  @ApiResponse({ status: 200, description: 'Price list item updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Item not found' })
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
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remove product from price list (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'itemId', type: Number })
  @ApiResponse({ status: 204, description: 'Item removed from price list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.service.removeItem(id, itemId);
  }

  @Post(':id/customers')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Assign customer to price list (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, description: 'Customer assigned' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Price list not found' })
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
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Unassign customer from price list (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'customerId', type: Number })
  @ApiResponse({ status: 204, description: 'Customer unassigned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  unassignCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Param('customerId', ParseIntPipe) customerId: number,
  ) {
    return this.service.unassignCustomer(id, customerId);
  }
}
