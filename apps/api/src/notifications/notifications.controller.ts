import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../common/types/auth-request.type';
import { NotificationsService } from './notifications.service';
import { FindNotificationsQueryDto } from './dto/find-notifications-query.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  findAll(@Query() query: FindNotificationsQueryDto, @Req() req: AuthRequest) {
    return this.service.findAll(req.user.sub, query);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: AuthRequest) {
    const count = await this.service.getUnreadCount(req.user.sub);
    return { count };
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllRead(@Req() req: AuthRequest) {
    return this.service.markAllRead(req.user.sub);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.markRead(id, req.user.sub);
  }
}
