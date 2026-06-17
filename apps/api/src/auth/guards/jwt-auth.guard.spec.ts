import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import type { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RedisService } from '../../redis/redis.service';
import { Role } from '../../common/enums/role.enum';

const payload = { sub: 1, email: 'test@example.com', role: Role.User, jti: 'test-jti' };

function mockContext(authHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization: authHeader }, user: undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: { verify: jest.Mock };
  let redisService: { exists: jest.Mock };

  beforeEach(async () => {
    jwtService = { verify: jest.fn() };
    redisService = { exists: jest.fn().mockResolvedValue(false) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  it('returns true and populates request.user with valid token', async () => {
    jwtService.verify.mockReturnValue(payload);
    const request = { headers: { authorization: 'Bearer valid-token' }, user: undefined };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toEqual(payload);
  });

  it('throws 401 when Authorization header is missing', async () => {
    await expect(guard.canActivate(mockContext())).rejects.toThrow(UnauthorizedException);
  });

  it('throws 401 when scheme is not Bearer', async () => {
    await expect(guard.canActivate(mockContext('Basic dXNlcjpwYXNz'))).rejects.toThrow(UnauthorizedException);
  });

  it('throws 401 when token is invalid', async () => {
    jwtService.verify.mockImplementation(() => { throw new Error('invalid signature'); });
    await expect(guard.canActivate(mockContext('Bearer bad-token'))).rejects.toThrow(UnauthorizedException);
  });

  it('throws 401 when jti is blacklisted in Redis', async () => {
    jwtService.verify.mockReturnValue(payload);
    redisService.exists.mockResolvedValue(true);
    await expect(guard.canActivate(mockContext('Bearer valid-token'))).rejects.toThrow(UnauthorizedException);
  });
});
