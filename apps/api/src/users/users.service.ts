import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import ms from 'ms';
import { User } from './entities/user.entity';
import { RedisService } from '../redis/redis.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import type { UpdateMeDto } from './dto/update-me.dto';
import type { AdminUpdateUserDto } from './dto/admin-update-user.dto';

export interface UserProfile {
  id: number;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface PaginatedUsers {
  data: UserProfile[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable()
export class UsersService {
  private readonly accessTokenTtl: number;

  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    const raw = this.config.get<string>('JWT_EXPIRES_IN', '1h');
    this.accessTokenTtl = Math.floor(ms(raw as ms.StringValue) / 1000);
  }

  async getMe(userId: number): Promise<UserProfile> {
    const user = await this.repo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    return this.toProfile(user);
  }

  async updateMe(userId: number, dto: UpdateMeDto): Promise<UserProfile> {
    const user = await this.repo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== user.email) {
      const taken = await this.repo.findOneBy({ email: dto.email });
      if (taken) throw new ConflictException('Email already in use');
      user.email = dto.email;
    }

    const saved = await this.repo.save(user);
    return this.toProfile(saved);
  }

  async deleteMe(userId: number, jwtPayload: JwtPayload): Promise<void> {
    const user = await this.repo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    await this.repo.update(userId, { isActive: false });

    // Invalidate access token JTI and clear refresh token
    if (jwtPayload.exp) {
      const ttl = jwtPayload.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redis.set(`bl:${jwtPayload.jti}`, '1', ttl);
      }
    }
    await this.redis.del(`rt:${userId}`);
  }

  async findAll(page: number, limit: number): Promise<PaginatedUsers> {
    const [users, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: users.map((u) => this.toProfile(u)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adminUpdateUser(
    adminId: number,
    targetId: number,
    dto: AdminUpdateUserDto,
  ): Promise<UserProfile> {
    if (adminId === targetId) {
      throw new BadRequestException('Use /users/me to update your own account');
    }

    const user = await this.repo.findOneBy({ id: targetId });
    if (!user) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== user.email) {
      const taken = await this.repo.findOneBy({ email: dto.email });
      if (taken) throw new ConflictException('Email already in use');
    }

    const patch: Partial<User> = {};
    if (dto.email !== undefined) patch.email = dto.email;
    if (dto.role !== undefined) patch.role = dto.role;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;

    await this.repo.update(targetId, patch);

    if (dto.isActive === false) {
      await this.redis.del(`rt:${targetId}`);
      await this.redis.set(`bl:user:${targetId}`, '1', this.accessTokenTtl);
    } else if (dto.isActive === true) {
      await this.redis.del(`bl:user:${targetId}`);
    }

    const updated = await this.repo.findOneBy({ id: targetId });
    return this.toProfile(updated!);
  }

  async adminDeleteUser(adminId: number, targetId: number): Promise<void> {
    if (adminId === targetId) {
      throw new BadRequestException('Admin cannot delete their own account');
    }

    const user = await this.repo.findOneBy({ id: targetId });
    if (!user) throw new NotFoundException('User not found');

    await this.repo.update(targetId, { isActive: false });
    await this.redis.del(`rt:${targetId}`);
    await this.redis.set(`bl:user:${targetId}`, '1', this.accessTokenTtl);
  }

  private toProfile(user: User): UserProfile {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
