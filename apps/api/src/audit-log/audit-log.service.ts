import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import type { FindAuditLogsQueryDto } from './dto/find-audit-logs-query.dto';

export interface PaginatedAuditLogs {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(
    entityType: string,
    entityId: number,
    action: AuditLog['action'],
    changedFields: AuditLog['changedFields'],
    performedBy: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const entry = this.repo.create({
        entityType,
        entityId,
        action,
        changedFields: changedFields ?? null,
        performedBy,
        metadata: metadata ?? null,
      });
      await this.repo.save(entry);
    } catch (err) {
      this.logger.error(
        `Failed to save audit log [${action} ${entityType}#${entityId}]: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async findAll(query: FindAuditLogsQueryDto): Promise<PaginatedAuditLogs> {
    const { page, limit, entityType, entityId, performedBy, dateFrom, dateTo } = query;

    const qb = this.repo
      .createQueryBuilder('al')
      .orderBy('al.performedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (entityType) qb.andWhere('al.entityType = :entityType', { entityType });
    if (entityId) qb.andWhere('al.entityId = :entityId', { entityId });
    if (performedBy) qb.andWhere('al.performedBy = :performedBy', { performedBy });
    if (dateFrom) qb.andWhere('al.performedAt >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('al.performedAt <= :dateTo', { dateTo });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  findByEntity(entityType: string, entityId: number): Promise<AuditLog[]> {
    return this.repo
      .createQueryBuilder('al')
      .where('al.entityType = :entityType', { entityType })
      .andWhere('al.entityId = :entityId', { entityId })
      .orderBy('al.performedAt', 'DESC')
      .getMany();
  }
}
