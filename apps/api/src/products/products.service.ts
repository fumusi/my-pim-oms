import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { ProductStatus } from '../common/enums/product-status.enum';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import type { FindProductsQueryDto } from './dto/find-products-query.dto';

const MAX_LIMIT = 100;

export interface PaginatedProducts {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async findAll(query: FindProductsQueryDto): Promise<PaginatedProducts> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, MAX_LIMIT);

    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    // Archived products excluded by default; opt-in via status=archived
    if (!query.status) {
      qb.andWhere('p.archivedAt IS NULL');
    } else if (query.status === 'archived') {
      qb.andWhere('p.archivedAt IS NOT NULL');
    } else {
      qb.andWhere('p.archivedAt IS NULL');
      qb.andWhere('p.status = :status', { status: query.status });
    }

    if (query.categoryId) {
      qb.andWhere('c.id = :categoryId', { categoryId: query.categoryId });
    }

    if (query.search) {
      const s = `%${query.search}%`;
      qb.andWhere(
        `(
          p.name->>'en' ILIKE :s
          OR p.name->>'nl' ILIKE :s
          OR p.name->>'de' ILIKE :s
          OR p.barcode ILIKE :s
          OR EXISTS (
            SELECT 1 FROM exact_items ei
            WHERE ei.id = p.exact_id
              AND ei.code ILIKE :s
          )
        )`,
        { s },
      );
    }

    if (query.inStock === 'in_stock') {
      qb.andWhere('p.stock > 0');
    } else if (query.inStock === 'out_of_stock') {
      qb.andWhere('(p.stock IS NULL OR p.stock = 0)');
    } else if (query.inStock === 'low_stock') {
      qb.andWhere(
        '(p.lowStockThreshold IS NOT NULL AND p.stock IS NOT NULL AND p.stock >= 0 AND p.stock < p.lowStockThreshold)',
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findById(id: number): Promise<Product> {
    const product = await this.repo.findOne({ where: { id }, relations: { category: true } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async create(dto: CreateProductDto, updatedBy: string): Promise<Product> {
    const { categoryId, ...fields } = dto;
    const category = categoryId != null ? await this.resolveCategory(categoryId) : null;
    const product = this.repo.create({ ...fields, category, updatedBy });
    return this.repo.save(product);
  }

  async update(id: number, dto: UpdateProductDto, updatedBy: string): Promise<Product> {
    const product = await this.repo.findOne({ where: { id }, relations: { category: true } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);

    const { categoryId, ...fields } = dto;
    if (categoryId !== undefined) {
      product.category = categoryId != null ? await this.resolveCategory(categoryId) : null;
    }

    Object.assign(product, fields, { updatedBy });
    return this.repo.save(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.repo.findOneBy({ id });
    if (!product) throw new NotFoundException(`Product ${id} not found`);

    // Placeholder: replace with real query once the orders module is implemented
    const orderCount = await this.countOrderReferences(id, false);
    if (orderCount > 0) {
      throw new BadRequestException('Cannot delete product referenced in an order');
    }

    await this.repo.remove(product);
  }

  async archive(id: number): Promise<Product> {
    const product = await this.repo.findOneBy({ id });
    if (!product) throw new NotFoundException(`Product ${id} not found`);

    // Placeholder: replace with real query once the orders module is implemented
    const openOrderCount = await this.countOrderReferences(id, true);
    if (openOrderCount > 0) {
      throw new BadRequestException('Cannot archive product referenced in open or partial orders');
    }

    product.archivedAt = new Date();
    return this.repo.save(product);
  }

  async updateStatus(id: number, status: ProductStatus): Promise<Product> {
    const product = await this.repo.findOneBy({ id });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    product.status = status;
    return this.repo.save(product);
  }

  private async resolveCategory(categoryId: number): Promise<Category> {
    const category = await this.categoryRepo.findOneBy({ id: categoryId });
    if (!category) throw new NotFoundException(`Category ${categoryId} not found`);
    return category;
  }

  // openOnly=true → open/partial orders only (archive check); false → all orders (delete check)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async countOrderReferences(_productId: number, _openOnly: boolean): Promise<number> {
    return 0;
  }
}
