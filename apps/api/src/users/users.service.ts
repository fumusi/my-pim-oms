import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import ms from 'ms';
import * as XLSX from 'xlsx';
import { User } from './entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { RedisService } from '../redis/redis.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import type { UpdateMeDto } from './dto/update-me.dto';
import type { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import type { FindUsersQueryDto } from './dto/pagination.dto';

const FIRST_NAMES = ['Alice', 'Bob', 'Carol', 'David', 'Eve', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack'];
const LAST_NAMES = ['Smith', 'Jones', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson'];

export interface UserProfile {
  id: number;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  customerId: number | null;
}

export interface PaginatedUsers {
  data: UserProfile[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ImportUsersResult {
  imported: number;
  skipped: number;
  errors: { row: number; email: string; reason: string }[];
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly accessTokenTtl: number;

  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly auditLogService: AuditLogService,
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

  async findAll(query: FindUsersQueryDto): Promise<PaginatedUsers> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.repo.createQueryBuilder('u')
      .orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.search) {
      const s = `%${query.search}%`;
      qb.andWhere(
        '(u.email ILIKE :s OR u.firstName ILIKE :s OR u.lastName ILIKE :s)',
        { s },
      );
    }

    if (query.role !== undefined) {
      qb.andWhere('u.role = :role', { role: query.role });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('u.isActive = :isActive', { isActive: query.isActive });
    }

    if (query.customerId) {
      qb.andWhere('u.customerId = :customerId', { customerId: query.customerId });
    }

    const [users, total] = await qb.getManyAndCount();

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
    performedBy?: string,
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
    if (dto.customerId !== undefined) patch.customerId = dto.customerId;

    const changedFields: Record<string, { old: unknown; new: unknown }> = {};
    for (const key of Object.keys(patch) as (keyof Partial<User>)[]) {
      const oldVal = (user as unknown as Record<string, unknown>)[key];
      const newVal = (patch as unknown as Record<string, unknown>)[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changedFields[key] = { old: oldVal, new: newVal };
      }
    }

    await this.repo.update(targetId, patch);

    if (dto.isActive === false) {
      await this.redis.del(`rt:${targetId}`);
      await this.redis.set(`bl:user:${targetId}`, '1', this.accessTokenTtl);
    } else if (dto.isActive === true) {
      await this.redis.del(`bl:user:${targetId}`);
    }

    void this.auditLogService.log('User', targetId, 'update', changedFields, performedBy ?? 'system');
    return this.toProfile({ ...user, ...patch });
  }

  async adminDeleteUser(adminId: number, targetId: number, performedBy?: string): Promise<void> {
    if (adminId === targetId) {
      throw new BadRequestException('Admin cannot delete their own account');
    }

    const user = await this.repo.findOneBy({ id: targetId });
    if (!user) throw new NotFoundException('User not found');

    await this.repo.update(targetId, { isActive: false });
    await this.redis.del(`rt:${targetId}`);
    await this.redis.set(`bl:user:${targetId}`, '1', this.accessTokenTtl);
    void this.auditLogService.log('User', targetId, 'status_change', null, performedBy ?? 'system', { from: true, to: false });
  }

  getUserImportTemplate(): Buffer {
    const adminIndices = new Set([0, 5, 10, 15, 20]);
    const rows = Array.from({ length: 50 }, (_, i) => ({
      first_name: FIRST_NAMES[i % FIRST_NAMES.length],
      last_name: LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length],
      email: `test${i}@example.com`,
      role: adminIndices.has(i) ? 'admin' : 'user',
      status: i % 2 === 0 ? 'active' : 'inactive',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users Import Template');
    return XLSX.write(wb, { type: 'buffer', bookType: 'csv' }) as Buffer;
  }

  async importUsers(
    buffer: Buffer,
    adminId: number,
    adminEmail: string,
  ): Promise<ImportUsersResult> {
    const key = `rl:users:import:${adminId}`;
    const count = await this.redis.incrWithExpireOnCreate(key, 600);
    if (count > 5) {
      throw new HttpException(
        'Rate limit: max 5 imports per 10 minutes',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('Invalid file — upload a valid CSV file');
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });

    if (rows.length > 2000) {
      throw new BadRequestException('CSV must not exceed 2000 rows');
    }

    const str = (v: unknown): string | undefined => {
      const s = String(v).trim();
      return s.length > 0 ? s : undefined;
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    type ValidRow = {
      first_name: string;
      last_name: string;
      email: string;
      role: string;
      status: string;
      rowIndex: number;
    };

    const validRows: ValidRow[] = [];
    const errors: ImportUsersResult['errors'] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const firstName = str(row['first_name']);
      const lastName = str(row['last_name']);
      const email = str(row['email']);
      const role = str(row['role']);
      const statusRaw = str(row['status']);

      if (!firstName) {
        errors.push({
          row: rowNum,
          email: email ?? '',
          reason: 'first_name is required',
        });
        continue;
      }
      if (!lastName) {
        errors.push({
          row: rowNum,
          email: email ?? '',
          reason: 'last_name is required',
        });
        continue;
      }
      if (!email) {
        errors.push({ row: rowNum, email: '', reason: 'email is required' });
        continue;
      }
      if (!emailRegex.test(email)) {
        errors.push({ row: rowNum, email, reason: 'email is invalid' });
        continue;
      }
      if (!role || !Object.values(Role).includes(role as Role)) {
        errors.push({
          row: rowNum,
          email,
          reason: 'role must be admin or user',
        });
        continue;
      }
      if (
        statusRaw !== undefined &&
        statusRaw !== 'active' &&
        statusRaw !== 'inactive'
      ) {
        errors.push({
          row: rowNum,
          email,
          reason: 'status must be active or inactive',
        });
        continue;
      }

      validRows.push({
        first_name: firstName,
        last_name: lastName,
        email,
        role,
        status: statusRaw ?? 'active',
        rowIndex: rowNum,
      });
    }

    const seenInFile = new Set<string>();
    const dedupedRows: ValidRow[] = [];
    for (const row of validRows) {
      if (seenInFile.has(row.email)) {
        errors.push({ row: row.rowIndex, email: row.email, reason: 'Duplicate email in file' });
      } else {
        seenInFile.add(row.email);
        dedupedRows.push(row);
      }
    }

    const validEmails = dedupedRows.map((r) => r.email);
    const existing =
      validEmails.length > 0
        ? await this.repo.find({
            where: validEmails.map((e) => ({ email: e })),
          })
        : [];
    const takenEmails = new Set(existing.map((u) => u.email));

    const rowsToInsert: ValidRow[] = [];
    let skipped = 0;

    for (const row of dedupedRows) {
      if (takenEmails.has(row.email)) {
        errors.push({
          row: row.rowIndex,
          email: row.email,
          reason: 'Email already exists',
        });
        skipped++;
      } else {
        rowsToInsert.push(row);
      }
    }

    let imported = 0;

    if (rowsToInsert.length > 0) {
      await this.repo.manager.transaction(async (em) => {
        for (const row of rowsToInsert) {
          try {
            const user = em.create(User, {
              firstName: row.first_name,
              lastName: row.last_name,
              email: row.email,
              role: row.role as Role,
              isActive: row.status !== 'inactive',
              password: null,
            });
            await em.save(User, user);
            imported++;
          } catch (err: unknown) {
            const e = err as { code?: string };
            if (e?.code === '23505') {
              errors.push({ row: row.rowIndex, email: row.email, reason: 'Email already exists' });
              skipped++;
            } else {
              throw err;
            }
          }
        }
      });
    }

    this.logger.log(
      `User import by ${adminEmail} (id=${adminId}): imported=${imported}, skipped=${skipped}, errors=${errors.length}`,
    );
    if (errors.length > 0) {
      this.logger.warn(
        `Import errors: ${JSON.stringify(errors.map(({ row, reason }) => ({ row, reason })))}`,
      );
    }

    return { imported, skipped, errors };
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
      customerId: user.customerId ?? null,
    };
  }
}
