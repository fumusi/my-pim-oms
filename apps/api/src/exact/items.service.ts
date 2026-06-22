import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  countByCategory(categoryId: number): Promise<number> {
    return this.repo.count({ where: { category: { id: categoryId } } });
  }

  async deactivateByCategoryId(categoryId: number): Promise<void> {
    await this.repo
      .createQueryBuilder('item')
      .update()
      .set({ isSalesItem: false })
      .where('item.category = :id', { id: categoryId })
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
