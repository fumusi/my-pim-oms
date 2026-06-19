import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { ExactItem } from '../exact/entities/exact-item.entity';
import { CategoryStatus } from '../common/enums/category-status.enum';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(ExactItem)
    private readonly itemRepo: Repository<ExactItem>,
  ) {}

  findAll(): Promise<Category[]> {
    return this.categoryRepo.find({ order: { id: 'ASC' } });
  }

  findOne(id: number): Promise<Category | null> {
    return this.categoryRepo.findOne({ where: { id } });
  }

  async create(data: Partial<Category>, updatedBy?: string): Promise<Category> {
    const category = this.categoryRepo.create({ ...data, updatedBy: updatedBy ?? null });
    return this.categoryRepo.save(category);
  }

  async update(id: number, data: Partial<Category>, updatedBy?: string): Promise<Category> {
    const category = await this.categoryRepo.findOneOrFail({ where: { id } });
    Object.assign(category, data, { updatedBy: updatedBy ?? null });
    return this.categoryRepo.save(category);
  }

  async setStatus(id: number, status: CategoryStatus, updatedBy?: string): Promise<Category> {
    const category = await this.categoryRepo.findOneOrFail({ where: { id } });
    category.status = status;
    category.updatedBy = updatedBy ?? null;
    const saved = await this.categoryRepo.save(category);

    // When a category is deactivated, mark all its products as non-sales items.
    // isSalesItem is the current PIM proxy for "active" — replace with a dedicated
    // pim_status column once that field is added to exact_items.
    if (status === CategoryStatus.Inactive) {
      await this.itemRepo
        .createQueryBuilder()
        .update()
        .set({ isSalesItem: false })
        .where('"category_id" = :id', { id })
        .execute();
    }

    return saved;
  }

  async archive(id: number, updatedBy?: string): Promise<Category> {
    const category = await this.categoryRepo.findOneOrFail({ where: { id } });
    category.archivedAt = new Date();
    category.updatedBy = updatedBy ?? null;
    return this.categoryRepo.save(category);
  }

  async delete(id: number): Promise<void> {
    const count = await this.itemRepo.count({ where: { category: { id } } });
    if (count > 0) {
      throw new BadRequestException(
        `Cannot delete category: ${count} product${count === 1 ? '' : 's'} still assigned`,
      );
    }
    await this.categoryRepo.delete(id);
  }

  // applyTemplate: will be implemented once ExactItem gains a pim_template column.
  // Chosen strategy: override (category template fully replaces product template).
}
