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
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthRequest } from '../common/types/auth-request.type';
import { CustomersService } from './customers.service';
import { FindCustomersQueryDto } from './dto/find-customers-query.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateCustomerStatusDto } from './dto/update-customer-status.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  findAll(@Query() query: FindCustomersQueryDto) {
    return this.service.findAll(query);
  }

  @Post()
  @Roles(Role.Admin)
  create(@Body() dto: CreateCustomerDto, @Req() req: AuthRequest) {
    return this.service.create(dto, req.user.email);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.update(id, dto, req.user.email);
  }

  @Patch(':id/status')
  @Roles(Role.Admin)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerStatusDto,
  ) {
    return this.service.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Patch(':id/archive')
  @Roles(Role.Admin)
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.service.archive(id);
  }

  @Post(':id/contacts')
  @Roles(Role.Admin)
  createContact(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateContactDto,
  ) {
    return this.service.createContact(id, dto);
  }

  @Patch(':id/contacts/:contactId')
  @Roles(Role.Admin)
  updateContact(
    @Param('id', ParseIntPipe) id: number,
    @Param('contactId', ParseIntPipe) contactId: number,
    @Body() dto: UpdateContactDto,
  ) {
    return this.service.updateContact(id, contactId, dto);
  }

  @Delete(':id/contacts/:contactId')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeContact(
    @Param('id', ParseIntPipe) id: number,
    @Param('contactId', ParseIntPipe) contactId: number,
  ) {
    return this.service.removeContact(id, contactId);
  }

  @Patch(':id/contacts/:contactId/primary')
  @Roles(Role.Admin)
  setPrimaryContact(
    @Param('id', ParseIntPipe) id: number,
    @Param('contactId', ParseIntPipe) contactId: number,
  ) {
    return this.service.setPrimaryContact(id, contactId);
  }

  @Post(':id/addresses')
  @Roles(Role.Admin)
  createAddress(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAddressDto,
  ) {
    return this.service.createAddress(id, dto);
  }

  @Patch(':id/addresses/:addressId')
  @Roles(Role.Admin)
  updateAddress(
    @Param('id', ParseIntPipe) id: number,
    @Param('addressId', ParseIntPipe) addressId: number,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.service.updateAddress(id, addressId, dto);
  }

  @Delete(':id/addresses/:addressId')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAddress(
    @Param('id', ParseIntPipe) id: number,
    @Param('addressId', ParseIntPipe) addressId: number,
  ) {
    return this.service.removeAddress(id, addressId);
  }

  @Patch(':id/addresses/:addressId/primary')
  @Roles(Role.Admin)
  setPrimaryAddress(
    @Param('id', ParseIntPipe) id: number,
    @Param('addressId', ParseIntPipe) addressId: number,
  ) {
    return this.service.setPrimaryAddress(id, addressId);
  }
}
