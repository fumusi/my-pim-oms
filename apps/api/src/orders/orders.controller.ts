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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthRequest } from '../common/types/auth-request.type';
import { OrdersService } from './orders.service';
import { OrderInvoiceService } from './order-invoice.service';
import { OrderCalculationService } from './order-calculation.service';
import { FindOrdersQueryDto } from './dto/find-orders-query.dto';
import { CreateOrderDto, CreateLineItemDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateLineItemDto } from './dto/update-line-item.dto';
import { ArchiveOrderDto } from './dto/archive-order.dto';
import { BulkEditOrderDto } from './dto/bulk-edit-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly service: OrdersService,
    private readonly invoiceService: OrderInvoiceService,
    private readonly calc: OrderCalculationService,
  ) {}

  @Get()
  @Roles(Role.Admin, Role.User)
  findAll(@Query() query: FindOrdersQueryDto, @Req() req: AuthRequest) {
    if (req.user.role === Role.User) {
      query.createdBy = req.user.email;
    }
    return this.service.findAll(query);
  }

  @Get('revenue')
  @Roles(Role.Admin)
  getRevenueSummary() {
    return this.service.getRevenueSummary();
  }

  @Get('config')
  @Roles(Role.Admin, Role.User)
  getConfig() {
    return { freeShippingThreshold: this.calc.getThreshold() };
  }

  @Get(':id')
  @Roles(Role.Admin, Role.User)
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const order = await this.service.findById(id);
    if (req.user.role === Role.User && order.createdBy !== req.user.email) {
      throw new ForbiddenException();
    }
    return order;
  }

  @Get(':id/invoice')
  @Roles(Role.Admin, Role.User)
  async getInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
    @Res() res: Response,
  ) {
    const order = await this.service.findById(id);
    if (req.user.role === Role.User && order.createdBy !== req.user.email) {
      throw new ForbiddenException();
    }
    const pdf = await this.invoiceService.generateInvoice(order);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${order.orderNumber}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  @Post()
  @Roles(Role.Admin, Role.User)
  create(@Body() dto: CreateOrderDto, @Req() req: AuthRequest) {
    const createdBy =
      req.user.role === Role.Admin && dto.onBehalfOf
        ? dto.onBehalfOf
        : req.user.email;

    if (
      req.user.role === Role.User &&
      req.user.customerId != null &&
      dto.customerId != null &&
      dto.customerId !== req.user.customerId
    ) {
      throw new ForbiddenException('Cannot create order for another customer');
    }

    return this.service.create(dto, createdBy, req.user.role);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.update(id, dto, req.user.email);
  }

  @Patch(':id/bulk-edit')
  @Roles(Role.Admin)
  bulkEdit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BulkEditOrderDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.bulkEdit(id, dto, req.user.email);
  }

  @Patch(':id/status')
  @Roles(Role.Admin)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.updateStatus(id, dto.status, req.user.email);
  }

  @Post(':id/items')
  @Roles(Role.Admin)
  addLineItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateLineItemDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.addLineItem(id, dto, req.user.email);
  }

  @Patch(':id/items/:itemId')
  @Roles(Role.Admin)
  updateLineItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateLineItemDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.updateLineItem(id, itemId, dto, req.user.email);
  }

  @Delete(':id/items/:itemId')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeLineItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Req() req: AuthRequest,
  ) {
    return this.service.removeLineItem(id, itemId, req.user.email);
  }

  @Patch(':id/archive')
  @Roles(Role.Admin)
  archive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ArchiveOrderDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.archive(id, dto.archiveReason, req.user.email);
  }
}
