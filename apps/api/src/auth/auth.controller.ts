import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Post, Query, Req, Res, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, CookieOptions } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import type { GithubProfile } from './strategies/github.strategy';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

const REFRESH_COOKIE = 'refreshToken';

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
});

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive access token' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
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
  @ApiOperation({ summary: 'Refresh access token using cookie' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid or missing refresh token' })
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
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if address is registered' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or invalid token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'Password reset successfully.' };
  }

  @Get('github')
  @Public()
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Redirect to GitHub OAuth' })
  @ApiResponse({ status: 302, description: 'Redirect to GitHub' })
  github() {}

  @Get('github/callback')
  @Public()
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend with auth code' })
  async githubCallback(
    @Req() req: Request & { user: GithubProfile },
    @Res() res: Response,
  ) {
    const tokens = await this.authService.findOrCreateGithubUser(req.user);
    const code = await this.authService.createOAuthExchangeCode(tokens);
    res.redirect(`${this.config.getOrThrow('APP_URL')}/auth/callback?code=${code}`);
  }

  @Get('exchange')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange OAuth code for tokens' })
  @ApiQuery({ name: 'code', required: true, description: 'OAuth exchange code' })
  @ApiResponse({ status: 200, description: 'Tokens issued' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async exchange(
    @Query('code') code: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.exchangeOAuthCode(code);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions());
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout and clear cookie' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @Req() req: Request & { user: JwtPayload },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user, req.cookies[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: 0 });
    return { message: 'Logged out' };
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  me(@Req() req: Request & { user: JwtPayload }) {
    return this.authService.getProfile(req.user.sub);
  }
}
