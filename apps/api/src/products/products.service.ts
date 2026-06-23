import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { ProductStatus } from '../common/enums/product-status.enum';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

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
