import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { ItemsService } from '../exact/items.service';
import { CategoryStatus } from '../common/enums/category-status.enum';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly itemsService: ItemsService,
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

    // When a category is deactivated, all its products are set to isSalesItem=false.
    // isSalesItem is the current PIM proxy for "active" (replace with pim_status column later).
    // NOTE: re-activation does NOT restore products — any product deactivated here stays
    // inactive until manually re-enabled. This is intentional until pim_status lands.
    if (status === CategoryStatus.Inactive) {
      await this.itemsService.deactivateByCategoryId(id);
    }

    return saved;
  }

  async archive(id: number, updatedBy?: string): Promise<Category> {
    const category = await this.categoryRepo.findOneOrFail({ where: { id } });
    if (category.archivedAt) return category;
    category.archivedAt = new Date();
    category.updatedBy = updatedBy ?? null;
    return this.categoryRepo.save(category);
  }

  async delete(id: number): Promise<void> {
    const count = await this.itemsService.countByCategory(id);
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
