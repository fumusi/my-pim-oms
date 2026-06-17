import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Post, Req, Res,
} from '@nestjs/common';
import type { Request, Response, CookieOptions } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

const REFRESH_COOKIE = 'refreshToken';

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions());
    return { accessToken };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.refresh(
      req.cookies[REFRESH_COOKIE],
    );
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions());
    return { accessToken };
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request & { user: JwtPayload },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user, req.cookies[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: 0 });
    return { message: 'Logged out' };
  }

  @Get('me')
  me(@Req() req: Request & { user: JwtPayload }) {
    const { sub, email, role } = req.user;
    return { id: sub, email, role };
  }
}
