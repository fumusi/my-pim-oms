import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ExactItem } from './entities/exact-item.entity';

const MAX_LIMIT = 100;

export interface PaginatedItems {
  data: ExactItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
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
