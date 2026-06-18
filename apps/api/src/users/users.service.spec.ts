import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { RedisService } from '../redis/redis.service';
import { Role } from '../common/enums/role.enum';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 1,
    email: 'test@example.com',
    password: 'hash',
    role: Role.User,
    firstName: 'Alice',
    lastName: 'Smith',
    avatarUrl: null,
    isActive: true,
    phoneNumber: null,
    confirmationToken: null,
    resetToken: null,
    resetTokenExpiresAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }) as User;

const makeJwt = (overrides: Partial<JwtPayload> = {}): JwtPayload => ({
  sub: 1,
  email: 'test@example.com',
  role: Role.User,
  jti: 'test-jti',
  exp: Math.floor(Date.now() / 1000) + 3600,
  ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;
  let repo: Record<string, jest.Mock>;
  let redis: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      findOneBy: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    redis = {
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: RedisService, useValue: redis },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('1h') } },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  // ── getMe ────────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('returns user profile', async () => {
      const user = makeUser();
      repo.findOneBy.mockResolvedValue(user);

      const result = await service.getMe(1);

      expect(result.id).toBe(1);
      expect(result.email).toBe('test@example.com');
      expect(result.isActive).toBe(true);
    });

    it('throws NotFoundException when user missing', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.getMe(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateMe ─────────────────────────────────────────────────────────────────

  describe('updateMe', () => {
    it('updates email when new email is available', async () => {
      const user = makeUser();
      repo.findOneBy
        .mockResolvedValueOnce(user)       // find current user
        .mockResolvedValueOnce(null);      // no conflict
      repo.save.mockResolvedValue({ ...user, email: 'new@example.com' });

      const result = await service.updateMe(1, { email: 'new@example.com' });

      expect(result.email).toBe('new@example.com');
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com' }),
      );
    });

    it('throws ConflictException on duplicate email', async () => {
      repo.findOneBy
        .mockResolvedValueOnce(makeUser())
        .mockResolvedValueOnce(makeUser({ id: 2, email: 'taken@example.com' }));

      await expect(
        service.updateMe(1, { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('skips email check when email is unchanged', async () => {
      const user = makeUser();
      repo.findOneBy.mockResolvedValueOnce(user);
      repo.save.mockResolvedValue(user);

      await service.updateMe(1, { email: 'test@example.com' });

      expect(repo.findOneBy).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when user missing', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.updateMe(99, { email: 'x@x.com' })).rejects.toThrow(NotFoundException);
    });
  });

  // ── deleteMe ─────────────────────────────────────────────────────────────────

  describe('deleteMe', () => {
    it('sets isActive false and clears tokens', async () => {
      repo.findOneBy.mockResolvedValue(makeUser());
      repo.update.mockResolvedValue({});
      redis.set.mockResolvedValue(undefined);
      redis.del.mockResolvedValue(undefined);

      const jwt = makeJwt();
      await service.deleteMe(1, jwt);

      expect(repo.update).toHaveBeenCalledWith(1, { isActive: false });
      expect(redis.set).toHaveBeenCalledWith(
        `bl:${jwt.jti}`,
        '1',
        expect.any(Number),
      );
      expect(redis.del).toHaveBeenCalledWith('rt:1');
    });

    it('throws NotFoundException when user missing', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.deleteMe(99, makeJwt())).rejects.toThrow(NotFoundException);
    });
  });

  // ── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated results', async () => {
      const users = [makeUser(), makeUser({ id: 2, email: 'b@example.com' })];
      repo.findAndCount.mockResolvedValue([users, 2]);

      const result = await service.findAll(1, 20);

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({ total: 2, page: 1, limit: 20, totalPages: 1 });
    });

    it('calculates totalPages correctly', async () => {
      repo.findAndCount.mockResolvedValue([[], 45]);
      const result = await service.findAll(1, 20);
      expect(result.meta.totalPages).toBe(3);
    });

    it('applies skip/take for page 2', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll(2, 10);
      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  // ── adminUpdateUser ──────────────────────────────────────────────────────────

  describe('adminUpdateUser', () => {
    it('updates role and returns updated profile', async () => {
      const user = makeUser();
      repo.findOneBy
        .mockResolvedValueOnce(user)                        // target lookup
        .mockResolvedValueOnce({ ...user, role: Role.Admin }); // after update
      repo.update.mockResolvedValue({});
      redis.del.mockResolvedValue(undefined);

      const result = await service.adminUpdateUser(2, 1, { role: Role.Admin });

      expect(repo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ role: Role.Admin }),
      );
      expect(result.role).toBe(Role.Admin);
    });

    it('blacklists tokens and clears refresh token when deactivating', async () => {
      const user = makeUser();
      repo.findOneBy
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce({ ...user, isActive: false });
      repo.update.mockResolvedValue({});
      redis.del.mockResolvedValue(undefined);
      redis.set.mockResolvedValue(undefined);

      await service.adminUpdateUser(2, 1, { isActive: false });

      expect(redis.del).toHaveBeenCalledWith('rt:1');
      expect(redis.set).toHaveBeenCalledWith('bl:user:1', '1', 3600);
    });

    it('clears user blacklist when reactivating', async () => {
      const user = makeUser({ isActive: false });
      repo.findOneBy
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce({ ...user, isActive: true });
      repo.update.mockResolvedValue({});
      redis.del.mockResolvedValue(undefined);

      await service.adminUpdateUser(2, 1, { isActive: true });

      expect(redis.del).toHaveBeenCalledWith('bl:user:1');
    });

    it('throws BadRequestException when admin updates themselves', async () => {
      await expect(service.adminUpdateUser(1, 1, { role: Role.User })).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when target missing', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.adminUpdateUser(2, 99, {})).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException on duplicate email', async () => {
      repo.findOneBy
        .mockResolvedValueOnce(makeUser())
        .mockResolvedValueOnce(makeUser({ id: 3, email: 'taken@example.com' }));

      await expect(
        service.adminUpdateUser(2, 1, { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── adminDeleteUser ──────────────────────────────────────────────────────────

  describe('adminDeleteUser', () => {
    it('soft-deletes target user and blacklists their tokens', async () => {
      repo.findOneBy.mockResolvedValue(makeUser({ id: 5 }));
      repo.update.mockResolvedValue({});
      redis.del.mockResolvedValue(undefined);
      redis.set.mockResolvedValue(undefined);

      await service.adminDeleteUser(2, 5);

      expect(repo.update).toHaveBeenCalledWith(5, { isActive: false });
      expect(redis.del).toHaveBeenCalledWith('rt:5');
      expect(redis.set).toHaveBeenCalledWith('bl:user:5', '1', 3600);
    });

    it('throws BadRequestException when admin tries to self-delete', async () => {
      await expect(service.adminDeleteUser(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when target missing', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.adminDeleteUser(2, 99)).rejects.toThrow(NotFoundException);
    });
  });
});
