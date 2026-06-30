import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import * as XLSX from 'xlsx';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { ProductStatus } from '../common/enums/product-status.enum';
import { mapImportRow, TEMPLATE_HEADERS } from './import/import-row.mapper';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import type { FindProductsQueryDto } from './dto/find-products-query.dto';
import type { LocalizedText } from '../common/types/localized-text.interface';

const MAX_LIMIT = 100;

export interface PaginatedProducts {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface BulkActionResult {
  success: number[];
  skipped: { id: number; reason: string }[];
}

export interface ImportSummary {
  imported: number;
  updated: number;
  errors: { row: number; reason: string }[];
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly auditLogService: AuditLogService,
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

    this.applyFilters(qb, query);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  private applyFilters(qb: SelectQueryBuilder<Product>, query: FindProductsQueryDto): void {
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
    const saved = await this.repo.save(product);
    void this.auditLogService.log('Product', saved.id, 'create', null, updatedBy, { snapshot: { ...saved } });
    return saved;
  }

  async update(id: number, dto: UpdateProductDto, updatedBy: string): Promise<Product> {
    const product = await this.repo.findOne({ where: { id }, relations: { category: true } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);

    const { categoryId, ...fields } = dto;

    const changedFields: Record<string, { old: unknown; new: unknown }> = {};
    for (const key of Object.keys(fields)) {
      const oldVal = (product as unknown as Record<string, unknown>)[key];
      const newVal = (fields as unknown as Record<string, unknown>)[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changedFields[key] = { old: oldVal, new: newVal };
      }
    }

    if (categoryId !== undefined) {
      const newCategory = categoryId != null ? await this.resolveCategory(categoryId) : null;
      const oldCatId = product.category?.id ?? null;
      const newCatId = newCategory?.id ?? null;
      if (oldCatId !== newCatId) {
        changedFields['categoryId'] = { old: oldCatId, new: newCatId };
      }
      product.category = newCategory;
    }

    Object.assign(product, fields, { updatedBy });
    const saved = await this.repo.save(product);
    void this.auditLogService.log('Product', id, 'update', changedFields, updatedBy);
    return saved;
  }

  async remove(id: number, performedBy: string): Promise<void> {
    const product = await this.repo.findOneBy({ id });
    if (!product) throw new NotFoundException(`Product ${id} not found`);

    // Placeholder: replace with real query once the orders module is implemented
    const orderCount = await this.countOrderReferences(id, false);
    if (orderCount > 0) {
      throw new BadRequestException('Cannot delete product referenced in an order');
    }

    const snapshot = { ...product };
    await this.repo.remove(product);
    void this.auditLogService.log('Product', id, 'delete', null, performedBy, { snapshot });
  }

  async archive(id: number, performedBy: string): Promise<Product> {
    const product = await this.repo.findOneBy({ id });
    if (!product) throw new NotFoundException(`Product ${id} not found`);

    // Placeholder: replace with real query once the orders module is implemented
    const openOrderCount = await this.countOrderReferences(id, true);
    if (openOrderCount > 0) {
      throw new BadRequestException('Cannot archive product referenced in open or partial orders');
    }

    product.archivedAt = new Date();
    const saved = await this.repo.save(product);
    void this.auditLogService.log('Product', id, 'archive', null, performedBy, { snapshot: { ...saved } });
    return saved;
  }

  async updateStatus(id: number, status: ProductStatus, performedBy: string): Promise<Product> {
    const product = await this.repo.findOneBy({ id });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    const oldStatus = product.status;
    product.status = status;
    product.statusLocked = true;
    const saved = await this.repo.save(product);
    void this.auditLogService.log('Product', id, 'status_change', null, performedBy, { from: oldStatus, to: status });
    return saved;
  }

  async bulkArchive(ids: number[], performedBy: string): Promise<BulkActionResult> {
    const products = await this.repo.findBy({ id: In(ids) });
    const foundIds = new Set(products.map((p) => p.id));
    const success: number[] = [];
    const skipped: { id: number; reason: string }[] = [];

    for (const product of products) {
      const openOrderCount = await this.countOrderReferences(product.id, true);
      if (openOrderCount > 0) {
        skipped.push({ id: product.id, reason: 'referenced in open order' });
        continue;
      }
      product.archivedAt = new Date();
      const saved = await this.repo.save(product);
      void this.auditLogService.log('Product', product.id, 'archive', null, performedBy, { snapshot: { ...saved } });
      success.push(product.id);
    }

    for (const id of ids) {
      if (!foundIds.has(id)) skipped.push({ id, reason: 'not found' });
    }

    return { success, skipped };
  }

  async bulkUpdateStatus(ids: number[], status: ProductStatus, performedBy: string): Promise<BulkActionResult> {
    const products = await this.repo.findBy({ id: In(ids) });
    const foundIds = new Set(products.map((p) => p.id));
    const success: number[] = [];
    const skipped: { id: number; reason: string }[] = [];

    const eligibleIds = products.map((p) => p.id);
    if (eligibleIds.length > 0) {
      await this.repo.update({ id: In(eligibleIds) }, { status, statusLocked: true });
    }

    for (const product of products) {
      void this.auditLogService.log('Product', product.id, 'status_change', null, performedBy, { from: product.status, to: status });
    }

    success.push(...eligibleIds);

    for (const id of ids) {
      if (!foundIds.has(id)) skipped.push({ id, reason: 'not found' });
    }

    return { success, skipped };
  }

  async bulkRemove(ids: number[], performedBy: string): Promise<BulkActionResult> {
    const products = await this.repo.findBy({ id: In(ids) });
    const foundIds = new Set(products.map((p) => p.id));
    const success: number[] = [];
    const skipped: { id: number; reason: string }[] = [];

    for (const product of products) {
      const orderCount = await this.countOrderReferences(product.id, false);
      if (orderCount > 0) {
        skipped.push({ id: product.id, reason: 'referenced in an order' });
        continue;
      }
      const snapshot = { ...product };
      const productId = product.id;
      await this.repo.remove(product);
      void this.auditLogService.log('Product', productId, 'delete', null, performedBy, { snapshot });
      success.push(productId);
    }

    for (const id of ids) {
      if (!foundIds.has(id)) skipped.push({ id, reason: 'not found' });
    }

    return { success, skipped };
  }

  async importProducts(buffer: Buffer, _mimetype: string, updatedBy: string): Promise<ImportSummary> {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('Invalid file — upload a valid .xlsx or .csv file');
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

    let imported = 0;
    let updated = 0;
    const errors: ImportSummary['errors'] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // row 1 = header
      const mapped = mapImportRow(rows[i]);

      if (!mapped.ok) {
        errors.push({ row: rowNum, reason: mapped.reason });
        continue;
      }

      try {
        const { exactId, barcode, categoryId, ...fields } = mapped.data;
        let existing: Product | null = null;

        if (exactId) {
          existing = await this.repo.findOne({ where: { exactId }, relations: { category: true } });
        } else if (barcode) {
          existing = await this.repo.findOne({ where: { barcode }, relations: { category: true } });
        }

        const category = categoryId != null ? await this.resolveCategory(categoryId) : undefined;

        if (existing) {
          Object.assign(existing, fields, { updatedBy });
          if (category !== undefined) existing.category = category;
          await this.repo.save(existing);
          updated++;
        } else {
          if (!fields.name?.nl && !fields.name?.en && !fields.name?.de) {
            errors.push({ row: rowNum, reason: 'name is required for new products (provide name_nl, name_en, or name_de)' });
            continue;
          }
          const product = this.repo.create({
            ...fields,
            exactId: exactId ?? null,
            barcode: barcode ?? null,
            category: category ?? null,
            updatedBy,
          });
          await this.repo.save(product);
          imported++;
        }
      } catch (err) {
        errors.push({ row: rowNum, reason: err instanceof Error ? err.message : 'Unexpected error' });
      }
    }

    return { imported, updated, errors };
  }

  async exportProducts(query: FindProductsQueryDto, isAdmin: boolean): Promise<Buffer> {
    const qb = this.repo.createQueryBuilder('p').leftJoinAndSelect('p.category', 'c').orderBy('p.createdAt', 'DESC');
    this.applyFilters(qb, query);
    const products = await qb.getMany();

    const rows = products.map((p) => {
      const pick = (text: LocalizedText | null | undefined, lang: string) =>
        text ? (text[lang as keyof LocalizedText] ?? '') : '';
      const row: Record<string, unknown> = {
        id: p.id,
        exactId: p.exactId ?? '',
        barcode: p.barcode ?? '',
        name_nl: pick(p.name, 'nl'),
        name_en: pick(p.name, 'en'),
        name_de: pick(p.name, 'de'),
        description_nl: pick(p.description, 'nl'),
        description_en: pick(p.description, 'en'),
        description_de: pick(p.description, 'de'),
        status: p.status,
        categoryId: p.category?.id ?? '',
        stock: p.stock ?? '',
        backorder: p.backorder,
        lowStockThreshold: p.lowStockThreshold ?? '',
        endDate: p.endDate ?? '',
        weight: p.weight ?? '',
        height: p.height ?? '',
        width: p.width ?? '',
        depth: p.depth ?? '',
        length: p.length ?? '',
        thickness: p.thickness ?? '',
        capacity: p.capacity ?? '',
        color: p.color ?? '',
        material: p.material ?? '',
        application: p.application ?? '',
        countryOfOrigin: p.countryOfOrigin ?? '',
        suitableFor: p.suitableFor ?? '',
        finishing: p.finishing ?? '',
        co2EmissionProduction: p.co2EmissionProduction ?? '',
        co2EmissionTransport: p.co2EmissionTransport ?? '',
        douProduct: p.douProduct ?? '',
        biodegradable: p.biodegradable ?? '',
        handmade: p.handmade ?? '',
        scratchProne: p.scratchProne ?? '',
        typeOfClosure: p.typeOfClosure ?? '',
        gemstoneType: p.gemstoneType ?? '',
        basePrice: p.basePrice ?? '',
        currency: p.currency ?? '',
        salesVatCode: p.salesVatCode ?? '',
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
      if (isAdmin) {
        row['purchasePrice'] = p.purchasePrice ?? '';
        row['purchaseVatCode'] = p.purchaseVatCode ?? '';
      }
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    return XLSX.write(wb, { type: 'buffer', bookType: 'csv' }) as Buffer;
  }

  getImportTemplate(): Buffer {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS as unknown as string[]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import Template');
    return XLSX.write(wb, { type: 'buffer', bookType: 'csv' }) as Buffer;
  }

  async deactivateExpiredProducts(): Promise<{ deactivated: number }> {
    const today = new Date().toISOString().split('T')[0];
    const products = await this.repo
      .createQueryBuilder('p')
      .where('p.endDate IS NOT NULL')
      .andWhere('p.endDate <= :today', { today })
      .andWhere('p.status = :status', { status: ProductStatus.Active })
      .andWhere('p.archivedAt IS NULL')
      .getMany();

    if (products.length === 0) return { deactivated: 0 };

    for (const p of products) {
      const oldStatus = p.status;
      p.status = ProductStatus.Inactive;
      void this.auditLogService.log('Product', p.id, 'status_change', null, 'system', { from: oldStatus, to: ProductStatus.Inactive });
    }
    await this.repo.save(products);

    Logger.log(`Deactivated ${products.length} expired product(s)`, 'ProductsScheduleService');
    return { deactivated: products.length };
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
