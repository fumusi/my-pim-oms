import { Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '../common/enums/role.enum';
import { ExactOnlineAuthService } from './exact-online-auth.service';
import { ExactSyncService } from './exact-sync.service';

@Controller('exact-online')
export class ExactController {
  private readonly frontendUrl: string;

  constructor(
    private readonly authService: ExactOnlineAuthService,
    private readonly syncService: ExactSyncService,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl = this.config.get<string>('APP_URL', 'http://localhost:5173');
  }

  @Get('authorize')
  @Public()
  getAuthorizeUrl() {
    return { url: this.authService.getAuthorizationUrl() };
  }

  @Get('callback')
  @Public()
  async callback(@Query('code') code: string, @Res() res: Response) {
    await this.authService.authCallback(code);
    res.redirect(`${this.frontendUrl}/dashboard?exact_connected=1`);
  }

  @Get('status')
  @Roles(Role.Admin)
  status() {
    return { status: this.authService.getConnectionStatus() };
  }

  @Post('sync/products')
  @Roles(Role.Admin)
  syncProducts() {
    return this.syncService.syncProducts();
  }
}
