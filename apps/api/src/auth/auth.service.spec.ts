import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';
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

const savedUser = { id: 1, email: 'test@example.com', role: Role.User } as User;

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: { findOneBy: jest.Mock; create: jest.Mock; save: jest.Mock };
  let mailService: { sendConfirmationEmail: jest.Mock };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    usersRepo = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mailService = { sendConfirmationEmail: jest.fn() };
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: MailService, useValue: mailService },
        { provide: JwtService, useValue: jwtService },
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

      expect(mailService.sendConfirmationEmail).toHaveBeenCalledWith(registerDto.email);
    });
  });

  describe('login', () => {
    let userWithHash: User;

    beforeEach(async () => {
      userWithHash = {
        ...savedUser,
        password: await bcrypt.hash('Password1', 10),
      } as User;
    });

    it('returns access token on valid credentials', async () => {
      usersRepo.findOneBy.mockResolvedValue(userWithHash);

      const result = await service.login(loginDto);

      expect(result).toEqual({ accessToken: 'signed-token' });
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

    it('signs JWT with userId, email and role in payload', async () => {
      usersRepo.findOneBy.mockResolvedValue(userWithHash);

      await service.login(loginDto);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: savedUser.id,
        email: savedUser.email,
        role: savedUser.role,
      });
    });
  });
});
