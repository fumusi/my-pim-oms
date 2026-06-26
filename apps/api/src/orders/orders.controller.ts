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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthRequest } from '../common/types/auth-request.type';
import { OrdersService } from './orders.service';
import { OrderInvoiceService } from './order-invoice.service';
import { FindOrdersQueryDto } from './dto/find-orders-query.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateLineItemDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateLineItemDto } from './dto/update-line-item.dto';
import { ArchiveOrderDto } from './dto/archive-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly service: OrdersService,
    private readonly invoiceService: OrderInvoiceService,
  ) {}

  @Get()
  findAll(@Query() query: FindOrdersQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Get(':id/invoice')
  @Roles(Role.Admin)
  async getInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const order = await this.service.findById(id);
    const pdf = await this.invoiceService.generateInvoice(order);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${order.orderNumber}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  @Post()
  @Roles(Role.Admin)
  create(@Body() dto: CreateOrderDto, @Req() req: AuthRequest) {
    return this.service.create(dto, req.user.email);
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
