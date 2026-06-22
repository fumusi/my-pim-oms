import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
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

  async create(data: CreateCategoryDto, updatedBy?: string): Promise<Category> {
    const category = this.categoryRepo.create({ ...data, updatedBy: updatedBy ?? null });
    return this.categoryRepo.save(category);
  }

  async update(id: number, data: UpdateCategoryDto, updatedBy?: string): Promise<Category> {
    const category = await this.categoryRepo.findOneOrFail({ where: { id } });
    Object.assign(category, data, { updatedBy: updatedBy ?? null });
    return this.categoryRepo.save(category);
  }

  async setStatus(id: number, status: CategoryStatus, updatedBy?: string): Promise<Category> {
    // Category save and item deactivation run in one transaction so they can't diverge.
    // NOTE: re-activation does NOT restore products — any product deactivated here stays
    // inactive until manually re-enabled. This is intentional until a pim_status column lands.
    return this.categoryRepo.manager.transaction(async (em) => {
      const category = await em.findOneOrFail(Category, { where: { id } });
      category.status = status;
      category.updatedBy = updatedBy ?? null;
      const saved = await em.save(category);

      if (status === CategoryStatus.Inactive) {
        await this.itemsService.deactivateByCategoryId(id, em);
      }

      return saved;
    });
  }

  async archive(id: number, updatedBy?: string): Promise<Category> {
    const category = await this.categoryRepo.findOneOrFail({ where: { id } });
    if (category.archivedAt) return category;
    category.archivedAt = new Date();
    category.updatedBy = updatedBy ?? null;
    return this.categoryRepo.save(category);
  }

  async delete(id: number): Promise<void> {
    await this.categoryRepo.findOneOrFail({ where: { id } });
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
