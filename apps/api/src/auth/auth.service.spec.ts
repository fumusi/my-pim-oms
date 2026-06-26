import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';
import { RedisService } from '../redis/redis.service';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';

const registerDto: RegisterDto = {
  email: 'test@example.com',
  password: 'Password1',
  confirmPassword: 'Password1',
};

const loginDto: LoginDto = {
  email: 'test@example.com',
  password: 'Password1',
};

const savedUser = { id: 1, email: 'test@example.com', role: Role.User, isActive: true } as User;

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: { findOneBy: jest.Mock; create: jest.Mock; save: jest.Mock; update: jest.Mock };
  let mailService: { sendConfirmationEmail: jest.Mock; sendPasswordResetEmail: jest.Mock };
  let jwtService: { signAsync: jest.Mock };
  let redisService: { get: jest.Mock; set: jest.Mock; del: jest.Mock; exists: jest.Mock };

  beforeEach(async () => {
    usersRepo = { findOneBy: jest.fn(), create: jest.fn(), save: jest.fn(), update: jest.fn() };
    mailService = { sendConfirmationEmail: jest.fn(), sendPasswordResetEmail: jest.fn() };
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    redisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: MailService, useValue: mailService },
        { provide: JwtService, useValue: jwtService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('returns id and email on success', async () => {
      usersRepo.findOneBy.mockResolvedValue(null);
      usersRepo.create.mockReturnValue(savedUser);
      usersRepo.save.mockResolvedValue(savedUser);

      const result = await service.register(registerDto);

      expect(result).toEqual({ id: 1, email: registerDto.email });
    });

    it('throws 409 when email already exists', async () => {
      usersRepo.findOneBy.mockResolvedValue(savedUser);
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('hashes the password before saving', async () => {
      usersRepo.findOneBy.mockResolvedValue(null);
      usersRepo.create.mockReturnValue(savedUser);
      usersRepo.save.mockResolvedValue(savedUser);

      await service.register(registerDto);

      const created: Partial<User> = usersRepo.create.mock.calls[0][0];
      expect(created.password).not.toBe(registerDto.password);
      await expect(bcrypt.compare(registerDto.password, created.password!)).resolves.toBe(true);
    });

    it('assigns Role.User by default', async () => {
      usersRepo.findOneBy.mockResolvedValue(null);
      usersRepo.create.mockReturnValue(savedUser);
      usersRepo.save.mockResolvedValue(savedUser);

      await service.register(registerDto);

      const created: Partial<User> = usersRepo.create.mock.calls[0][0];
      expect(created.role).toBe(Role.User);
    });

    it('triggers confirmation email after registration', async () => {
      usersRepo.findOneBy.mockResolvedValue(null);
      usersRepo.create.mockReturnValue(savedUser);
      usersRepo.save.mockResolvedValue(savedUser);

      await service.register(registerDto);

      expect(mailService.sendConfirmationEmail).toHaveBeenCalledWith(registerDto.email, expect.stringMatching(/^[0-9a-f]{64}$/));
    });
  });

  describe('login', () => {
    let userWithHash: User;

    beforeEach(async () => {
      userWithHash = { ...savedUser, password: await bcrypt.hash('Password1', 10) } as User;
      redisService.set.mockResolvedValue(undefined);
    });

    it('returns accessToken and refreshToken on valid credentials', async () => {
      usersRepo.findOneBy.mockResolvedValue(userWithHash);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken', 'signed-token');
      expect(result).toHaveProperty('refreshToken');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('throws 401 when email not found', async () => {
      usersRepo.findOneBy.mockResolvedValue(null);
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws 401 when password is wrong', async () => {
      usersRepo.findOneBy.mockResolvedValue(userWithHash);
      await expect(service.login({ ...loginDto, password: 'WrongPass1' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('signs JWT with userId, email, role and jti', async () => {
      usersRepo.findOneBy.mockResolvedValue(userWithHash);

      await service.login(loginDto);

      const payload = jwtService.signAsync.mock.calls[0][0];
      expect(payload).toMatchObject({ sub: savedUser.id, email: savedUser.email, role: savedUser.role });
      expect(typeof payload.jti).toBe('string');
    });

    it('stores hashed refresh token in Redis', async () => {
      usersRepo.findOneBy.mockResolvedValue(userWithHash);

      const { refreshToken } = await service.login(loginDto);

      expect(redisService.set).toHaveBeenCalledWith(
        `rt:${savedUser.id}`,
        expect.any(String),
        expect.any(Number),
      );
      // the stored value must NOT be the plain token
      const storedHash = redisService.set.mock.calls[0][1];
      expect(storedHash).not.toBe(refreshToken);
    });
  });

  describe('findOrCreateGithubUser', () => {
    const githubProfile = {
      email: 'gh@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      avatarUrl: null,
    };

    it('issues tokens for an existing active user', async () => {
      usersRepo.findOneBy.mockResolvedValue(savedUser);
      redisService.set.mockResolvedValue(undefined);

      const result = await service.findOrCreateGithubUser({ ...githubProfile, email: savedUser.email });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws 401 for a deactivated user', async () => {
      usersRepo.findOneBy.mockResolvedValue({ ...savedUser, isActive: false });

      await expect(
        service.findOrCreateGithubUser({ ...githubProfile, email: savedUser.email }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('creates a new user when email is not found and issues tokens', async () => {
      const newUser = { ...savedUser, id: 99, email: githubProfile.email };
      usersRepo.findOneBy.mockResolvedValue(null);
      usersRepo.create.mockReturnValue(newUser);
      usersRepo.save.mockResolvedValue(newUser);
      redisService.set.mockResolvedValue(undefined);

      const result = await service.findOrCreateGithubUser(githubProfile);

      expect(usersRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('refresh', () => {
    it('throws 401 when no refresh token provided', async () => {
      await expect(service.refresh(undefined)).rejects.toThrow(UnauthorizedException);
    });

    it('throws 401 when refresh token not found in Redis', async () => {
      redisService.get.mockResolvedValue(null);
      await expect(service.refresh('1:abc')).rejects.toThrow(UnauthorizedException);
    });

    it('throws 401 when refresh token hash does not match', async () => {
      redisService.get.mockResolvedValue('wrong-hash');
      await expect(service.refresh('1:abc')).rejects.toThrow(UnauthorizedException);
    });

    it('rotates refresh token and returns new accessToken', async () => {
      const userWithHash = { ...savedUser, password: await bcrypt.hash('Password1', 10) } as User;
      // Simulate a valid refresh token by going through login first
      redisService.set.mockResolvedValue(undefined);
      usersRepo.findOneBy.mockResolvedValue(userWithHash);
      const { refreshToken } = await service.login(loginDto);

      // Now simulate what Redis stored
      const storedHash = redisService.set.mock.calls[0][1];
      redisService.get.mockResolvedValue(storedHash);
      redisService.del.mockResolvedValue(undefined);

      const result = await service.refresh(refreshToken);

      expect(result).toHaveProperty('accessToken', 'signed-token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.refreshToken).not.toBe(refreshToken); // rotated
      expect(redisService.del).toHaveBeenCalledWith(`rt:${savedUser.id}`);
    });
  });

  describe('logout', () => {
    it('blacklists the access token jti in Redis', async () => {
      const user = { sub: 1, email: 'test@example.com', role: Role.User, customerId: null, jti: 'abc-123', exp: Math.floor(Date.now() / 1000) + 3600 };
      redisService.set.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(undefined);

      await service.logout(user, undefined);

      expect(redisService.set).toHaveBeenCalledWith('bl:abc-123', '1', expect.any(Number));
    });

    it('deletes refresh token from Redis on logout', async () => {
      const user = { sub: 1, email: 'test@example.com', role: Role.User, customerId: null, jti: 'abc-123', exp: Math.floor(Date.now() / 1000) + 3600 };
      redisService.set.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(undefined);

      await service.logout(user, '1:some-refresh-token');

      expect(redisService.del).toHaveBeenCalledWith('rt:1');
    });
  });

  describe('forgotPassword', () => {
    it('returns without error when email is not found (no enumeration)', async () => {
      usersRepo.findOneBy.mockResolvedValue(null);
      await expect(service.forgotPassword({ email: 'nobody@example.com' })).resolves.toBeUndefined();
      expect(usersRepo.update).not.toHaveBeenCalled();
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('stores token hash in DB and sends raw token in email', async () => {
      usersRepo.findOneBy.mockResolvedValue(savedUser);
      usersRepo.update.mockResolvedValue(undefined);
      mailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      await service.forgotPassword({ email: savedUser.email });

      const [id, patch] = usersRepo.update.mock.calls[0];
      expect(id).toBe(savedUser.id);
      expect(patch.resetTokenExpiresAt).toBeInstanceOf(Date);
      expect(patch.resetTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());

      const [emailTo, rawToken] = mailService.sendPasswordResetEmail.mock.calls[0];
      expect(emailTo).toBe(savedUser.email);
      expect(rawToken).toHaveLength(64); // 32 bytes hex
      expect(patch.resetToken).not.toBe(rawToken); // DB stores hash, not raw
      expect(patch.resetToken).toBe(createHash('sha256').update(rawToken).digest('hex'));
    });

    it('token expires in ~15 minutes', async () => {
      usersRepo.findOneBy.mockResolvedValue(savedUser);
      usersRepo.update.mockResolvedValue(undefined);
      mailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const before = Date.now();
      await service.forgotPassword({ email: savedUser.email });
      const after = Date.now();

      const [, patch] = usersRepo.update.mock.calls[0];
      const ttlMs = patch.resetTokenExpiresAt.getTime();
      expect(ttlMs).toBeGreaterThanOrEqual(before + 15 * 60 * 1000);
      expect(ttlMs).toBeLessThanOrEqual(after + 15 * 60 * 1000);
    });
  });

  describe('resetPassword', () => {
    const rawToken = 'valid-token-abc123';
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const dto = { token: rawToken, newPassword: 'NewPass1', confirmPassword: 'NewPass1' };

    it('throws 400 when token not found', async () => {
      usersRepo.findOneBy.mockResolvedValue(null);
      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws 400 when token is expired', async () => {
      const expiredUser = {
        ...savedUser,
        resetToken: tokenHash,
        resetTokenExpiresAt: new Date(Date.now() - 1000),
      } as User;
      usersRepo.findOneBy.mockResolvedValue(expiredUser);
      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
    });

    it('hashes new password, clears reset token, and invalidates refresh token', async () => {
      const userWithToken = {
        ...savedUser,
        resetToken: tokenHash,
        resetTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      } as User;
      usersRepo.findOneBy.mockResolvedValue(userWithToken);
      usersRepo.update.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(undefined);

      await service.resetPassword(dto);

      const [id, patch] = usersRepo.update.mock.calls[0];
      expect(id).toBe(savedUser.id);
      expect(patch.password).not.toBe(dto.newPassword);
      await expect(bcrypt.compare(dto.newPassword, patch.password)).resolves.toBe(true);
      expect(patch.resetToken).toBeNull();
      expect(patch.resetTokenExpiresAt).toBeNull();
      expect(redisService.del).toHaveBeenCalledWith(`rt:${savedUser.id}`);
    });
  });
});
