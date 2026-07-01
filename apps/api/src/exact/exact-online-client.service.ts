import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { ODataResponse } from './types';
import { ExactOnlineAuthService } from './exact-online-auth.service';

@Injectable()
export class ExactOnlineClientService {
  private readonly baseUrl = 'https://start.exactonline.nl/api/v1';
  private readonly division: string;
  private readonly logger = new Logger(ExactOnlineClientService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly authService: ExactOnlineAuthService,
  ) {
    this.division = this.configService.getOrThrow<string>('EXACT_DIVISION');
  }

  async forEachPage<T>(
    initialPath: string,
    onPage: (items: T[]) => Promise<void> | void,
    delayMs = 150,
    maxPages?: number,
  ): Promise<void> {
    let nextUrl: string | undefined = initialPath;
    let page = 0;

    while (nextUrl) {
      if (maxPages !== undefined && page >= maxPages) {
        this.logger.warn(
          `forEachPage: reached maxPages cap (${maxPages}) on "${initialPath}" — some records were not fetched`,
        );
        break;
      }
      page++;
      const currentUrl = nextUrl;
      const resolvedUrl = this.resolveUrl(currentUrl);

      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          const response = await this.request(async () => {
            const token = await this.authService.getAccessToken();
            return firstValueFrom(
              this.httpService.get<ODataResponse<T>>(resolvedUrl, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: 'application/json',
                },
              }),
            );
          });

          await onPage(response.data.d?.results ?? []);

          const headers = response.headers as unknown as Record<
            string,
            string | undefined
          >;
          const remaining = parseInt(
            String(headers['x-ratelimit-remaining'] ?? '60'),
          );

          nextUrl = response.data.d?.__next;
          this.logger.debug(
            `forEachPage page ${page}: got ${response.data.d?.results?.length ?? 0} items, __next = ${nextUrl ?? 'none'}`,
          );

          if (nextUrl) {
            if (remaining <= 2) {
              const reset = parseInt(
                String(headers['x-ratelimit-reset'] ?? '0'),
              );
              const waitMs = reset
                ? Math.max(reset * 1000 - Date.now(), 0) + 1000
                : 60_000;
              this.logger.log(
                `Rate limit low (${remaining} remaining), waiting ${Math.ceil(waitMs / 1000)}s`,
              );
              await new Promise((resolve) => setTimeout(resolve, waitMs));
            } else if (delayMs > 0) {
              await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
          }
          break;
        } catch (err: unknown) {
          if (!(err instanceof AxiosError)) throw err;
          const status = err.response?.status;
          if (status !== 429) throw err;
          if (attempt === 5)
            throw new Error(`Rate limit retries exhausted for ${resolvedUrl}`);

          const retryAfter = parseInt(
            String(err.response?.headers?.['retry-after'] ?? '60'),
          );
          this.logger.warn(
            `429 rate limited, retrying after ${retryAfter}s (attempt ${attempt}/5)`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, retryAfter * 1000),
          );
        }
      }
    }
  }

  async get<T>(path: string): Promise<T> {
    return this.request(async () => {
      const token = await this.authService.getAccessToken();
      const response = await firstValueFrom(
        this.httpService.get<T>(`${this.baseUrl}/${this.division}/${path}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }),
      );
      return response.data;
    });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request(async () => {
      const token = await this.authService.getAccessToken();
      const response = await firstValueFrom(
        this.httpService.post<T>(
          `${this.baseUrl}/${this.division}/${path}`,
          body,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          },
        ),
      );
      return response.data;
    });
  }

  async put(path: string, body: unknown): Promise<void> {
    return this.request(async () => {
      const token = await this.authService.getAccessToken();
      await firstValueFrom(
        this.httpService.put(`${this.baseUrl}/${this.division}/${path}`, body, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }),
      );
    });
  }

  async delete(path: string): Promise<void> {
    return this.request(async () => {
      const token = await this.authService.getAccessToken();
      await firstValueFrom(
        this.httpService.delete(`${this.baseUrl}/${this.division}/${path}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }),
      );
    });
  }

  private async request<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: unknown) {
      if (err instanceof AxiosError && err.response?.status === 401) {
        this.authService.markDisconnected();
      }
      throw err;
    }
  }

  private resolveUrl(path: string): string {
    if (path.startsWith('https://')) return path;
    return `${this.baseUrl}/${this.division}/${path}`;
  }
}
