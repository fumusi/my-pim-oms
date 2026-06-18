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
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UsersService } from './users.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { PaginationDto } from './dto/pagination.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Self-service endpoints (all roles) ──────────────────────────────────────

  @Get('me')
  getMe(@Req() req: Request & { user: JwtPayload }) {
    return this.usersService.getMe(req.user.sub);
  }

  @Patch('me')
  updateMe(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: UpdateMeDto,
  ) {
    return this.usersService.updateMe(req.user.sub, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(@Req() req: Request & { user: JwtPayload }) {
    await this.usersService.deleteMe(req.user.sub, req.user);
  }

  // ── Admin-only endpoints ─────────────────────────────────────────────────────

  @Get()
  @Roles(Role.Admin)
  findAll(@Query() query: PaginationDto) {
    return this.usersService.findAll(query.page ?? 1, query.limit ?? 20);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  adminUpdateUser(
    @Req() req: Request & { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.usersService.adminUpdateUser(req.user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.Admin)
  async adminDeleteUser(
    @Req() req: Request & { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.usersService.adminDeleteUser(req.user.sub, id);
  }
}
