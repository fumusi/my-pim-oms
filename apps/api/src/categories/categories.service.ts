import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ItemsService, AssignResult } from '../exact/items.service';
import { CategoryStatus } from '../common/enums/category-status.enum';

export interface CategoryPimProduct {
  id: number;
  exactId: string | null;
  name: Record<string, string> | null;
  barcode: string | null;
  status: string;
  stock: number | null;
}

export interface PaginatedPimProducts {
  data: CategoryPimProduct[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface CategoryWithCount extends Category {
  productCount: number;
}

export interface CategoryDetail extends CategoryWithCount {
  products: PaginatedPimProducts;
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly itemsService: ItemsService,
  ) {}

  async findAll(statusFilter?: CategoryStatus): Promise<CategoryWithCount[]> {
    const where: FindOptionsWhere<Category> = { archivedAt: IsNull() };
    if (statusFilter) where.status = statusFilter;

    const categories = await this.categoryRepo.find({ where, order: { id: 'ASC' } });
    if (categories.length === 0) return [];

    const counts = await this.itemsService.countsByCategoryIds(categories.map((c) => c.id));
    return categories.map((c) => ({ ...c, productCount: counts.get(c.id) ?? 0 }));
  }

  findOne(id: number): Promise<Category | null> {
    return this.categoryRepo.findOne({ where: { id } });
  }

  async findOneDetail(id: number, page = 1, limit = 20, search?: string): Promise<CategoryDetail | null> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) return null;

    const safeLimit = Math.min(limit, 100);
    const offset = (page - 1) * safeLimit;
    const manager = this.categoryRepo.manager;

    const baseConditions = [`category_id = $1`];
    const params: unknown[] = [id];

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      baseConditions.push(
        `(name->>'en' ILIKE $${idx} OR name->>'nl' ILIKE $${idx} OR name->>'de' ILIKE $${idx} OR barcode ILIKE $${idx})`,
      );
    }

    const where = baseConditions.join(' AND ');

    const [countRows, rows] = await Promise.all([
      manager.query<[{ count: string }]>(`SELECT COUNT(*) FROM products WHERE ${where}`, params),
      manager.query<{ id: number; exact_id: string | null; name: Record<string, string> | null; barcode: string | null; status: string; stock: string | null }[]>(
        `SELECT id, exact_id, name, barcode, status, stock FROM products WHERE ${where} ORDER BY id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, safeLimit, offset],
      ),
    ]);

    const total = Number(countRows[0]?.count ?? 0);

    const products: PaginatedPimProducts = {
      data: rows.map((r) => ({
        id: r.id,
        exactId: r.exact_id,
        name: r.name,
        barcode: r.barcode,
        status: r.status,
        stock: r.stock != null ? Number(r.stock) : null,
      })),
      meta: { page, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) },
    };

    return { ...category, productCount: total, products };
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
    const count = await this.itemsService.countByCategory(id);
    if (count > 0) {
      throw new BadRequestException(
        `Cannot archive category: ${count} product${count === 1 ? '' : 's'} still assigned`,
      );
    }
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

  async assignProducts(id: number, productIds: string[]): Promise<AssignResult> {
    const category = await this.categoryRepo.findOneOrFail({ where: { id } });
    return this.itemsService.assignToCategory(productIds, id, category.template);
  }

  async unassignProducts(id: number, productIds: string[]): Promise<{ unassigned: number }> {
    await this.categoryRepo.findOneOrFail({ where: { id } });
    const unassigned = await this.itemsService.unassignFromCategory(productIds, id);
    return { unassigned };
  }

  // applyTemplate: will be implemented once ExactItem gains a pim_template column.
  // Chosen strategy: override (category template fully replaces product template).
}
