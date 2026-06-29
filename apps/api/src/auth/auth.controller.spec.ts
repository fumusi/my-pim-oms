import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Role } from '../common/enums/role.enum';
import type { Request, Response } from 'express';

function mockResponse(): jest.Mocked<Pick<Response, 'cookie' | 'clearCookie'>> {
  return { cookie: jest.fn(), clearCookie: jest.fn() };
}

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    register: jest.Mock;
    getProfile: jest.Mock;
    forgotPassword: jest.Mock;
    resetPassword: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      getProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('1h') } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('POST /auth/register', () => {
    it('returns id and email from authService.register', async () => {
      authService.register.mockResolvedValue({ id: 1, email: 'a@b.com' });
      await expect(
        controller.register({ email: 'a@b.com', password: 'Password1', confirmPassword: 'Password1' }),
      ).resolves.toEqual({ id: 1, email: 'a@b.com' });
    });
  });

  describe('POST /auth/login', () => {
    it('sets httpOnly refreshToken cookie and returns accessToken', async () => {
      authService.login.mockResolvedValue({
        accessToken: 'access-jwt',
        refreshToken: '1:refresh-opaque',
      });
      const res = mockResponse() as unknown as Response;

      const result = await controller.login(
        { email: 'a@b.com', password: 'Password1' },
        res,
      );

      expect(result).toEqual({ accessToken: 'access-jwt' });
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        '1:refresh-opaque',
        expect.objectContaining({
          httpOnly: true,
          path: '/api/auth',
          maxAge: 30 * 24 * 60 * 60 * 1000,
        }),
      );
    });
  });

  describe('POST /auth/refresh', () => {
    it('reads cookie from request and rotates it in response', async () => {
      authService.refresh.mockResolvedValue({
        accessToken: 'new-access-jwt',
        refreshToken: '1:new-refresh-opaque',
      });
      const res = mockResponse() as unknown as Response;
      const req = { cookies: { refreshToken: '1:old-refresh-opaque' } } as unknown as Request;

      const result = await controller.refresh(req, res);

      expect(authService.refresh).toHaveBeenCalledWith('1:old-refresh-opaque');
      expect(result).toEqual({ accessToken: 'new-access-jwt' });
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        '1:new-refresh-opaque',
        expect.objectContaining({ httpOnly: true, path: '/api/auth' }),
      );
    });
  });

  describe('GET /auth/me', () => {
    it('returns user profile from authService.getProfile', async () => {
      const jwtPayload = {
        sub: 1,
        email: 'a@b.com',
        role: Role.User,
        customerId: null,
        jti: 'jti-abc',
        iat: 1000,
        exp: 2000,
      };
      const profile = { id: 1, email: 'a@b.com', role: Role.User };
      authService.getProfile.mockResolvedValue(profile);
      const req = { user: jwtPayload } as unknown as Request & { user: typeof jwtPayload };
      await expect(controller.me(req)).resolves.toEqual(profile);
    });
  });

  describe('POST /auth/reset-password', () => {
    it('returns success message on valid token', async () => {
      authService.resetPassword.mockResolvedValue(undefined);
      const result = await controller.resetPassword({
        token: 'valid-token',
        newPassword: 'NewPass1',
        confirmPassword: 'NewPass1',
      });
      expect(authService.resetPassword).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Password reset successfully.' });
    });
  });

  describe('POST /auth/logout', () => {
    it('clears the refreshToken cookie', async () => {
      authService.logout.mockResolvedValue(undefined);
      const res = mockResponse() as unknown as Response;
      const jwtPayload = {
        sub: 1,
        email: 'a@b.com',
        role: Role.User,
        customerId: null,
        jti: 'jti-abc',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const req = {
        user: jwtPayload,
        cookies: { refreshToken: '1:refresh-opaque' },
      } as unknown as Request & { user: typeof jwtPayload };

      const result = await controller.logout(req, res);

      expect(authService.logout).toHaveBeenCalledWith(jwtPayload, '1:refresh-opaque');
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({ path: '/api/auth', maxAge: 0 }),
      );
      expect(result).toEqual({ message: 'Logged out' });
    });
  });
});
