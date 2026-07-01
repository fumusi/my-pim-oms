import { Controller, Get, Post, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
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

@ApiTags('Exact Online')
@Controller('exact-online')
export class ExactController {
  private readonly frontendUrl: string;
  private syncState: SyncStatus = { status: 'idle' };

  constructor(
    private readonly authService: ExactOnlineAuthService,
    private readonly syncService: ExactSyncService,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl = this.config.get<string>(
      'APP_URL',
      'http://localhost:5173',
    );
  }

  @Get('authorize')
  @Public()
  @ApiOperation({ summary: 'Get Exact Online OAuth authorization URL' })
  @ApiResponse({ status: 200, description: 'Authorization URL' })
  getAuthorizeUrl() {
    return { url: this.authService.getAuthorizationUrl() };
  }

  @Get('callback')
  @Public()
  @ApiOperation({ summary: 'Exact Online OAuth callback' })
  @ApiQuery({
    name: 'code',
    required: false,
    description: 'OAuth authorization code',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    description: 'OAuth state parameter',
  })
  @ApiResponse({ status: 302, description: 'Redirect to frontend' })
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() res: Response,
  ) {
    if (!code) {
      return res.redirect(
        `${this.frontendUrl}/dashboard?exact_error=missing_code`,
      );
    }
    if (!state || !this.authService.validateAndConsumeState(state)) {
      return res.redirect(
        `${this.frontendUrl}/dashboard?exact_error=invalid_state`,
      );
    }
    await this.authService.authCallback(code);
    res.redirect(`${this.frontendUrl}/dashboard?exact_connected=1`);
  }

  @Get('status')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get Exact Online connection status (admin)' })
  @ApiResponse({ status: 200, description: 'Connection status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  status() {
    return { status: this.authService.getConnectionStatus() };
  }

  @Post('sync/products')
  @Roles(Role.Admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Start product sync from Exact Online (admin)' })
  @ApiResponse({ status: 200, description: 'Sync started or already running' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
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
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get product sync status (admin)' })
  @ApiResponse({ status: 200, description: 'Sync status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getSyncStatus(): SyncStatus {
    return this.syncState;
  }
}
