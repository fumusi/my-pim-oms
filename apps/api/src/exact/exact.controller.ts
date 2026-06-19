import { Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '../common/enums/role.enum';
import { ExactOnlineAuthService } from './exact-online-auth.service';
import { ExactSyncService } from './exact-sync.service';
import type { SyncSummary } from './types';

type SyncStatus =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; result: SyncSummary }
  | { status: 'error'; error: string };

@Controller('exact-online')
export class ExactController {
  private readonly frontendUrl: string;
  private syncState: SyncStatus = { status: 'idle' };

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
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() res: Response,
  ) {
    if (!code) {
      return res.redirect(`${this.frontendUrl}/dashboard?exact_error=missing_code`);
    }
    if (!state || !this.authService.validateAndConsumeState(state)) {
      return res.redirect(`${this.frontendUrl}/dashboard?exact_error=invalid_state`);
    }
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
  startSync(): SyncStatus {
    if (this.syncState.status === 'running') {
      return this.syncState;
    }

    this.syncState = { status: 'running' };

    void this.syncService
      .syncProducts()
      .then((result) => {
        this.syncState = { status: 'done', result };
      })
      .catch((err: unknown) => {
        this.syncState = {
          status: 'error',
          error: err instanceof Error ? err.message : 'Sync failed',
        };
      });

    return this.syncState;
  }

  @Get('sync/products/status')
  @Roles(Role.Admin)
  getSyncStatus(): SyncStatus {
    return this.syncState;
  }
}
