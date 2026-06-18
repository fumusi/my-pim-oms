import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { TokenSet, TokenResponse, ConnectionStatus } from './types';
import { ExactOnlineToken } from './entities/exact-online-token.entity';

@Injectable()
export class ExactOnlineAuthService implements OnApplicationBootstrap {
  private readonly authUrl = 'https://start.exactonline.nl/api/oauth2/auth';
  private readonly tokenUrl = 'https://start.exactonline.nl/api/oauth2/token';
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private tokenSet: TokenSet | null = null;
  private refreshInFlight: Promise<void> | null = null;
  private connectionBroken = false;
  private readonly logger = new Logger(ExactOnlineAuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectRepository(ExactOnlineToken)
    private readonly tokenRepository: Repository<ExactOnlineToken>,
  ) {
    this.clientId = this.configService.getOrThrow<string>('EXACT_CLIENT_ID');
    this.clientSecret = this.configService.getOrThrow<string>('EXACT_CLIENT_SECRET');
    this.redirectUri = this.configService.getOrThrow<string>('EXACT_REDIRECT_URI');
  }

  async onApplicationBootstrap(): Promise<void> {
    const stored = await this.tokenRepository.findOne({ where: {} });
    if (!stored) return;
    this.tokenSet = {
      access_token: stored.access_token,
      refresh_token: stored.refresh_token,
      expires_at: stored.expires_at,
    };
  }

  markDisconnected(): void {
    if (this.connectionBroken) return;
    this.connectionBroken = true;
    this.logger.warn('Exact Online credentials revoked — marked as disconnected');
  }

  getConnectionStatus(): ConnectionStatus {
    if (this.connectionBroken) return 'unauthorized';
    if (!this.tokenSet) return 'disconnected';
    return 'connected';
  }

  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      force_login: '0',
    });
    return `${this.authUrl}?${params.toString()}`;
  }

  async authCallback(code: string): Promise<void> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await firstValueFrom(
      this.httpService.post<TokenResponse>(this.tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );

    await this.setTokens(response.data);
  }

  async getAccessToken(): Promise<string> {
    if (this.connectionBroken) {
      throw new UnauthorizedException('Exact Online credentials have been revoked.');
    }

    if (!this.tokenSet) {
      throw new UnauthorizedException('Not connected to Exact Online. Visit /exact/authorize first.');
    }

    if (Date.now() >= this.tokenSet.expires_at - 30_000) {
      if (!this.refreshInFlight) {
        this.refreshInFlight = this.doRefresh().finally(() => {
          this.refreshInFlight = null;
        });
      }

      try {
        await this.refreshInFlight;
      } catch (err) {
        if (this.connectionBroken) {
          throw new UnauthorizedException('Exact Online credentials have been revoked.', { cause: err });
        }
        throw err;
      }
    }

    return this.tokenSet.access_token;
  }

  private async doRefresh(): Promise<void> {
    if (!this.tokenSet) throw new Error('doRefresh called with no tokenSet');
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.tokenSet.refresh_token,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    try {
      const response = await firstValueFrom(
        this.httpService.post<TokenResponse>(this.tokenUrl, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      await this.setTokens(response.data);
    } catch (err: unknown) {
      if (
        err instanceof AxiosError &&
        (err.response?.status === 400 || err.response?.status === 401)
      ) {
        this.markDisconnected();
      }
      throw err;
    }
  }

  private async setTokens({ access_token, refresh_token, expires_in }: TokenResponse): Promise<void> {
    this.connectionBroken = false;
    const expires_at = Date.now() + (Number(expires_in) || 600) * 1000;
    this.tokenSet = { access_token, refresh_token, expires_at };

    const existing = await this.tokenRepository.findOne({ where: {} });
    if (existing) {
      await this.tokenRepository.save({ ...existing, access_token, refresh_token, expires_at });
    } else {
      await this.tokenRepository.save(
        this.tokenRepository.create({ access_token, refresh_token, expires_at }),
      );
    }
  }
}
