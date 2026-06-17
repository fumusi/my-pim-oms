import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';

const dto: RegisterDto = {
  email: 'test@example.com',
  password: 'Password1',
  confirmPassword: 'Password1',
};

const savedUser = { id: 1, email: dto.email, role: Role.User } as User;

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: { findOneBy: jest.Mock; create: jest.Mock; save: jest.Mock };
  let mailService: { sendConfirmationEmail: jest.Mock };

  beforeEach(async () => {
    usersRepo = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mailService = { sendConfirmationEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('returns id and email on success', async () => {
      usersRepo.findOneBy.mockResolvedValue(null);
      usersRepo.create.mockReturnValue(savedUser);
      usersRepo.save.mockResolvedValue(savedUser);

      const result = await service.register(dto);

      expect(result).toEqual({ id: 1, email: dto.email });
    });

    it('throws 409 when email already exists', async () => {
      usersRepo.findOneBy.mockResolvedValue(savedUser);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('hashes the password before saving', async () => {
      usersRepo.findOneBy.mockResolvedValue(null);
      usersRepo.create.mockReturnValue(savedUser);
      usersRepo.save.mockResolvedValue(savedUser);

      await service.register(dto);

      const created: Partial<User> = usersRepo.create.mock.calls[0][0];
      expect(created.password).not.toBe(dto.password);
      await expect(bcrypt.compare(dto.password, created.password!)).resolves.toBe(true);
    });

    it('assigns Role.User by default', async () => {
      usersRepo.findOneBy.mockResolvedValue(null);
      usersRepo.create.mockReturnValue(savedUser);
      usersRepo.save.mockResolvedValue(savedUser);

      await service.register(dto);

      const created: Partial<User> = usersRepo.create.mock.calls[0][0];
      expect(created.role).toBe(Role.User);
    });

    it('triggers confirmation email after registration', async () => {
      usersRepo.findOneBy.mockResolvedValue(null);
      usersRepo.create.mockReturnValue(savedUser);
      usersRepo.save.mockResolvedValue(savedUser);

      await service.register(dto);

      expect(mailService.sendConfirmationEmail).toHaveBeenCalledWith(dto.email);
    });
  });
});
