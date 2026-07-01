import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ItemsService, AssignResult } from '../exact/items.service';
import { CategoryStatus } from '../common/enums/category-status.enum';
import { ProductsService } from '../products/products.service';
import { AuditLogService } from '../audit-log/audit-log.service';

export interface CategoryPimProduct {
  id: number;
  exactId: string | null;
  name: { nl?: string; en?: string; de?: string } | null;
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
    private readonly productsService: ProductsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(statusFilter?: CategoryStatus): Promise<CategoryWithCount[]> {
    const where: FindOptionsWhere<Category> = { archivedAt: IsNull() };
    if (statusFilter) where.status = statusFilter;

    const categories = await this.categoryRepo.find({
      where,
      order: { id: 'ASC' },
    });
    if (categories.length === 0) return [];

    const counts = await this.itemsService.countsByCategoryIds(
      categories.map((c) => c.id),
    );
    return categories.map((c) => ({
      ...c,
      productCount: counts.get(c.id) ?? 0,
    }));
  }

  findOne(id: number): Promise<Category | null> {
    return this.categoryRepo.findOne({ where: { id } });
  }

  async findOneDetail(
    id: number,
    page = 1,
    limit = 20,
    search?: string,
  ): Promise<CategoryDetail | null> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) return null;

    const safeLimit = Math.min(limit, 100);

    const [unfilteredResult, pagedResult] = await Promise.all([
      this.productsService.findAll({ categoryId: id, page: 1, limit: 1 }),
      this.productsService.findAll({
        categoryId: id,
        search,
        page,
        limit: safeLimit,
      }),
    ]);

    const products: PaginatedPimProducts = {
      data: pagedResult.data.map((p) => ({
        id: p.id,
        exactId: p.exactId,
        name: p.name,
        barcode: p.barcode,
        status: p.status,
        stock: p.stock != null ? Number(p.stock) : null,
      })),
      meta: {
        page,
        limit: safeLimit,
        total: pagedResult.total,
        totalPages: Math.ceil(pagedResult.total / safeLimit),
      },
    };

    return { ...category, productCount: unfilteredResult.total, products };
  }

  async create(data: CreateCategoryDto, updatedBy?: string): Promise<Category> {
    const category = this.categoryRepo.create({
      ...data,
      updatedBy: updatedBy ?? null,
    });
    const saved = await this.categoryRepo.save(category);
    void this.auditLogService.log(
      'Category',
      saved.id,
      'create',
      null,
      updatedBy ?? 'system',
      { snapshot: { ...saved } },
    );
    return saved;
  }

  async update(
    id: number,
    data: UpdateCategoryDto,
    updatedBy?: string,
  ): Promise<Category> {
    const category = await this.categoryRepo.findOneOrFail({ where: { id } });

    const changedFields: Record<string, { old: unknown; new: unknown }> = {};
    for (const key of Object.keys(data)) {
      const oldVal = (category as unknown as Record<string, unknown>)[key];
      const newVal = (data as unknown as Record<string, unknown>)[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changedFields[key] = { old: oldVal, new: newVal };
      }
    }

    Object.assign(category, data, { updatedBy: updatedBy ?? null });
    const saved = await this.categoryRepo.save(category);
    void this.auditLogService.log(
      'Category',
      id,
      'update',
      changedFields,
      updatedBy ?? 'system',
    );
    return saved;
  }

  async setStatus(
    id: number,
    status: CategoryStatus,
    updatedBy?: string,
  ): Promise<Category> {
    // Category save and item deactivation run in one transaction so they can't diverge.
    // NOTE: re-activation does NOT restore products — any product deactivated here stays
    // inactive until manually re-enabled. This is intentional until a pim_status column lands.
    const saved = await this.categoryRepo.manager.transaction(async (em) => {
      const category = await em.findOneOrFail(Category, { where: { id } });
      const oldStatus = category.status;
      category.status = status;
      category.updatedBy = updatedBy ?? null;
      const result = await em.save(category);

      if (status === CategoryStatus.Inactive) {
        await this.itemsService.deactivateByCategoryId(id, em);
      }

      void this.auditLogService.log(
        'Category',
        id,
        'status_change',
        null,
        updatedBy ?? 'system',
        { from: oldStatus, to: status },
      );
      return result;
    });

    return saved;
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
    const saved = await this.categoryRepo.save(category);
    void this.auditLogService.log(
      'Category',
      id,
      'archive',
      null,
      updatedBy ?? 'system',
      { snapshot: { ...saved } },
    );
    return saved;
  }

  async delete(id: number, performedBy?: string): Promise<void> {
    const category = await this.categoryRepo.findOneOrFail({ where: { id } });
    const count = await this.itemsService.countByCategory(id);
    if (count > 0) {
      throw new BadRequestException(
        `Cannot delete category: ${count} product${count === 1 ? '' : 's'} still assigned`,
      );
    }
    const snapshot = { ...category };
    await this.categoryRepo.delete(id);
    void this.auditLogService.log(
      'Category',
      id,
      'delete',
      null,
      performedBy ?? 'system',
      { snapshot },
    );
  }

  async assignProducts(
    id: number,
    productIds: string[],
  ): Promise<AssignResult> {
    const category = await this.categoryRepo.findOneOrFail({ where: { id } });
    return this.itemsService.assignToCategory(
      productIds,
      id,
      category.template,
    );
  }

  async unassignProducts(
    id: number,
    productIds: string[],
  ): Promise<{ unassigned: number }> {
    await this.categoryRepo.findOneOrFail({ where: { id } });
    const unassigned = await this.itemsService.unassignFromCategory(
      productIds,
      id,
    );
    return { unassigned };
  }

  // applyTemplate: will be implemented once ExactItem gains a pim_template column.
  // Chosen strategy: override (category template fully replaces product template).
}
