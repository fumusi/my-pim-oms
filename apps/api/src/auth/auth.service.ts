import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { randomBytes, createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { MailService } from '../mail/mail.service';
import { RedisService } from '../redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async register(dto: RegisterDto): Promise<{ id: number; email: string }> {
    const existing = await this.usersRepository.findOneBy({ email: dto.email });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.usersRepository.create({
      email: dto.email,
      password: hashedPassword,
      role: Role.User,
    });

    const saved = await this.usersRepository.save(user);

    await this.mailService.sendConfirmationEmail(saved.email);

    return { id: saved.id, email: saved.email };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.usersRepository.findOneBy({ email: dto.email });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string | undefined): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException();
    }

    const userId = this.extractUserIdFromRefreshToken(refreshToken);
    const storedHash = await this.redisService.get(`rt:${userId}`);

    if (!storedHash || storedHash !== this.hashToken(refreshToken)) {
      throw new UnauthorizedException();
    }

    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException();
    }

    await this.redisService.del(`rt:${userId}`);
    return this.issueTokens(user);
  }

  async logout(user: JwtPayload, refreshToken: string | undefined): Promise<void> {
    if (user.exp) {
      const ttl = user.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redisService.set(`bl:${user.jti}`, '1', ttl);
      }
    }

    // Invalidate the refresh token
    if (refreshToken) {
      const userId = this.extractUserIdFromRefreshToken(refreshToken);
      await this.redisService.del(`rt:${userId}`);
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = this.hashToken(dto.token);
    const user = await this.usersRepository.findOneBy({ resetToken: tokenHash });

    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.usersRepository.update(user.id, {
      password: passwordHash,
      resetToken: null,
      resetTokenExpiresAt: null,
    });

    await this.redisService.del(`rt:${user.id}`);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersRepository.findOneBy({ email: dto.email });
    if (!user) return;

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.usersRepository.update(user.id, {
      resetToken: this.hashToken(rawToken),
      resetTokenExpiresAt: expiresAt,
    });

    await this.mailService.sendPasswordResetEmail(user.email, rawToken);
  }

  private async issueTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const jti = randomUUID();

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      jti,
    });

    const refreshToken = this.generateRefreshToken(user.id);
    await this.redisService.set(`rt:${user.id}`, this.hashToken(refreshToken), REFRESH_TOKEN_TTL);

    return { accessToken, refreshToken };
  }

  private generateRefreshToken(userId: number): string {
    return `${userId}:${randomBytes(40).toString('hex')}`;
  }

  private extractUserIdFromRefreshToken(token: string): number {
    const userId = parseInt(token.split(':')[0], 10);
    if (isNaN(userId)) throw new UnauthorizedException();
    return userId;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
