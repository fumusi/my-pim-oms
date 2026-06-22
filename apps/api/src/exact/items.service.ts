import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ExactItem } from './entities/exact-item.entity';

const MAX_LIMIT = 100;

export interface PaginatedItems {
  data: ExactItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface AssignResult {
  assigned: number;
  skipped: { id: string; reason: string }[];
}

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(ExactItem)
    private readonly repo: Repository<ExactItem>,
  ) {}

  // Count without JOIN — category_id lives on exact_items, no need to join categories.
  countByCategory(categoryId: number): Promise<number> {
    return this.repo
      .createQueryBuilder('item')
      .where('"category_id" = :id', { id: categoryId })
      .getCount();
  }

  // Batch count for multiple categories in one query (GROUP BY category_id).
  async countsByCategoryIds(categoryIds: number[]): Promise<Map<number, number>> {
    if (categoryIds.length === 0) return new Map();
    const rows = await this.repo
      .createQueryBuilder('item')
      .select('"category_id"', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .where('"category_id" IN (:...ids)', { ids: categoryIds })
      .groupBy('"category_id"')
      .getRawMany<{ categoryId: string; count: string }>();
    return new Map(rows.map((r) => [Number(r.categoryId), Number(r.count)]));
  }

  // Accepts an optional EntityManager so callers can include this in a transaction.
  async deactivateByCategoryId(categoryId: number, em?: EntityManager): Promise<void> {
    const manager = em ?? this.repo.manager;
    await manager
      .createQueryBuilder()
      .update(ExactItem)
      .set({ isSalesItem: false })
      .where('"category_id" = :id', { id: categoryId })
      .execute();
  }

  async findByCategoryId(categoryId: number, page = 1, limit = 20): Promise<PaginatedItems> {
    const safeLimit = Math.min(limit, MAX_LIMIT);
    const [data, total] = await this.repo
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.itemGroup', 'itemGroup')
      .where('"category_id" = :id', { id: categoryId })
      .orderBy('item.description', 'ASC')
      .skip((page - 1) * safeLimit)
      .take(safeLimit)
      .getManyAndCount();
    return { data, meta: { page, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
  }

  // Override strategy: category template fully replaces the product's existing pim_template.
  // If the category has no template (null), pim_template is cleared on the assigned products.
  // Wrapped in a transaction with SELECT FOR UPDATE to prevent double-assignment race conditions.
  async assignToCategory(
    productIds: string[],
    categoryId: number,
    categoryTemplate: Record<string, unknown> | null = null,
  ): Promise<AssignResult> {
    return this.repo.manager.transaction(async (em) => {
      const skipped: { id: string; reason: string }[] = [];

      // Lock rows for the duration of the transaction to prevent concurrent assignment races.
      const rows = await em
        .createQueryBuilder()
        .select('id, category_id')
        .from('exact_items', 'i')
        .where('id IN (:...ids)', { ids: productIds })
        .setLock('pessimistic_write')
        .getRawMany<{ id: string; category_id: string | null }>();

      const found = new Map(rows.map((r) => [r.id, r.category_id]));
      const toAssign: string[] = [];

      for (const pid of productIds) {
        if (!found.has(pid)) {
          skipped.push({ id: pid, reason: 'product not found' });
          continue;
        }
        const currentCategoryId = found.get(pid);
        if (currentCategoryId !== null && Number(currentCategoryId) === categoryId) {
          skipped.push({ id: pid, reason: 'already assigned to this category' });
          continue;
        }
        toAssign.push(pid);
      }

      if (toAssign.length > 0) {
        // Raw table name required in QB so FK columns (category_id, pim_template) can be set directly.
        await em
          .createQueryBuilder()
          .update('exact_items')
          .set({ category_id: categoryId, pim_template: categoryTemplate })
          .where('id IN (:...ids)', { ids: toAssign })
          .execute();
      }

      return { assigned: toAssign.length, skipped };
    });
  }

  async unassignFromCategory(productIds: string[], categoryId: number): Promise<number> {
    if (productIds.length === 0) return 0;

    // Only unassign items actually in this category — ignore others silently.
    const rows = await this.repo
      .createQueryBuilder('i')
      .select('i.id')
      .where('i.id IN (:...ids)', { ids: productIds })
      .andWhere('"category_id" = :cid', { cid: categoryId })
      .getMany();

    const toUnassign = rows.map((r) => r.id);
    if (toUnassign.length === 0) return 0;

    // Clear pim_template alongside category_id — template was stamped on assign, must be cleared on unassign.
    await this.repo.manager
      .createQueryBuilder()
      .update('exact_items')
      .set({ category_id: null, pim_template: null })
      .where('id IN (:...ids)', { ids: toUnassign })
      .execute();

    return toUnassign.length;
  }

  async findAll(page = 1, limit = 20): Promise<PaginatedItems> {
    const safeLimit = Math.min(limit, MAX_LIMIT);
    const skip = (page - 1) * safeLimit;

    const [data, total] = await this.repo.findAndCount({
      relations: { itemGroup: true },
      order: { description: 'ASC' },
      skip,
      take: safeLimit,
    });

    return {
      data,
      meta: { page, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) },
    };
  }
}
