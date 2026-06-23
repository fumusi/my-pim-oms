import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { ProductStatus } from '../common/enums/product-status.enum';

function makeQbMock(result: [Product[], number] = [[], 0]) {
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue(result),
  };
  return qb;
}

const makeProduct = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 1,
    exactId: null,
    name: { en: 'Test Product' },
    description: null,
    status: ProductStatus.Active,
    backorder: false,
    category: null,
    archivedAt: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Product;

const makeCategory = (overrides: Partial<Category> = {}): Category =>
  ({ id: 5, name: { en: 'Test Category' }, ...overrides }) as Category;

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepo: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let categoryRepo: { findOneBy: jest.Mock };
  let qb: ReturnType<typeof makeQbMock>;

  beforeEach(async () => {
    qb = makeQbMock();
    productRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    categoryRepo = { findOneBy: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
      ],
    }).compile();

    service = module.get(ProductsService);
  });

  describe('findById', () => {
    it('returns product with category relation loaded', async () => {
      const product = makeProduct({ category: makeCategory() });
      productRepo.findOne.mockResolvedValue(product);

      const result = await service.findById(1);

      expect(productRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 }, relations: { category: true } });
      expect(result).toBe(product);
    });

    it('throws NotFoundException when product does not exist', async () => {
      productRepo.findOne.mockResolvedValue(null);
      await expect(service.findById(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates product with updatedBy and no category when categoryId omitted', async () => {
      const dto = { name: { en: 'Vase' } };
      const saved = makeProduct({ name: { en: 'Vase' }, updatedBy: 'admin@test.com' });
      productRepo.save.mockResolvedValue(saved);

      const result = await service.create(dto as any, 'admin@test.com');

      expect(productRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: { en: 'Vase' }, updatedBy: 'admin@test.com', category: null }),
      );
      expect(result).toBe(saved);
    });

    it('resolves category when categoryId is provided', async () => {
      const category = makeCategory({ id: 5 });
      categoryRepo.findOneBy.mockResolvedValue(category);
      const dto = { name: { en: 'Vase' }, categoryId: 5 };
      productRepo.save.mockResolvedValue(makeProduct());

      await service.create(dto as any, 'admin@test.com');

      expect(categoryRepo.findOneBy).toHaveBeenCalledWith({ id: 5 });
      expect(productRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ category }),
      );
    });

    it('does not pass categoryId directly to repo.create', async () => {
      const dto = { name: { en: 'Vase' }, categoryId: 5 };
      categoryRepo.findOneBy.mockResolvedValue(makeCategory());
      productRepo.save.mockResolvedValue(makeProduct());

      await service.create(dto as any, 'admin@test.com');

      const [created] = productRepo.create.mock.calls[0];
      expect(created).not.toHaveProperty('categoryId');
    });

    it('throws NotFoundException when categoryId refers to missing category', async () => {
      categoryRepo.findOneBy.mockResolvedValue(null);
      const dto = { name: { en: 'Vase' }, categoryId: 999 };
      await expect(service.create(dto as any, 'admin@test.com')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('applies field changes and sets updatedBy', async () => {
      const product = makeProduct({ name: { en: 'Old' } });
      productRepo.findOne.mockResolvedValue(product);
      productRepo.save.mockResolvedValue({ ...product, name: { en: 'New' }, updatedBy: 'admin@test.com' });

      const result = await service.update(1, { name: { en: 'New' } } as any, 'admin@test.com');

      expect(productRepo.save).toHaveBeenCalled();
      expect(result.name).toEqual({ en: 'New' });
      expect(result.updatedBy).toBe('admin@test.com');
    });

    it('updates category relation when categoryId provided', async () => {
      const product = makeProduct();
      const newCategory = makeCategory({ id: 7 });
      productRepo.findOne.mockResolvedValue(product);
      categoryRepo.findOneBy.mockResolvedValue(newCategory);
      productRepo.save.mockResolvedValue(product);

      await service.update(1, { categoryId: 7 } as any, 'admin@test.com');

      expect(product.category).toBe(newCategory);
    });

    it('clears category when categoryId is null', async () => {
      const product = makeProduct({ category: makeCategory() });
      productRepo.findOne.mockResolvedValue(product);
      productRepo.save.mockResolvedValue(product);

      await service.update(1, { categoryId: null } as any, 'admin@test.com');

      expect(product.category).toBeNull();
    });

    it('does not touch category when categoryId is absent from dto', async () => {
      const category = makeCategory();
      const product = makeProduct({ category });
      productRepo.findOne.mockResolvedValue(product);
      productRepo.save.mockResolvedValue(product);

      await service.update(1, { backorder: true } as any, 'admin@test.com');

      expect(product.category).toBe(category);
      expect(categoryRepo.findOneBy).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when product does not exist', async () => {
      productRepo.findOne.mockResolvedValue(null);
      await expect(service.update(99, {} as any, 'admin@test.com')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes product when no order references exist', async () => {
      const product = makeProduct();
      productRepo.findOneBy.mockResolvedValue(product);

      await service.remove(1);

      expect(productRepo.remove).toHaveBeenCalledWith(product);
    });

    it('throws NotFoundException when product does not exist', async () => {
      productRepo.findOneBy.mockResolvedValue(null);
      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when product is referenced in an order', async () => {
      productRepo.findOneBy.mockResolvedValue(makeProduct());
      jest.spyOn(service as any, 'countOrderReferences').mockResolvedValue(2);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('archive', () => {
    it('sets archivedAt timestamp', async () => {
      const product = makeProduct({ archivedAt: null });
      productRepo.findOneBy.mockResolvedValue(product);
      productRepo.save.mockImplementation((p) => Promise.resolve(p));

      const before = new Date();
      const result = await service.archive(1);
      const after = new Date();

      expect(result.archivedAt).not.toBeNull();
      expect(result.archivedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.archivedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('throws NotFoundException when product does not exist', async () => {
      productRepo.findOneBy.mockResolvedValue(null);
      await expect(service.archive(99)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when product referenced in open orders', async () => {
      productRepo.findOneBy.mockResolvedValue(makeProduct());
      jest.spyOn(service as any, 'countOrderReferences').mockResolvedValue(1);

      await expect(service.archive(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('sets the new status and saves', async () => {
      const product = makeProduct({ status: ProductStatus.Active });
      productRepo.findOneBy.mockResolvedValue(product);
      productRepo.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.updateStatus(1, ProductStatus.Inactive);

      expect(result.status).toBe(ProductStatus.Inactive);
      expect(productRepo.save).toHaveBeenCalledWith(product);
    });

    it('throws NotFoundException when product does not exist', async () => {
      productRepo.findOneBy.mockResolvedValue(null);
      await expect(service.updateStatus(99, ProductStatus.Inactive)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns paginated structure with data, total, page, limit', async () => {
      const products = [makeProduct({ id: 1 }), makeProduct({ id: 2 })];
      qb.getManyAndCount.mockResolvedValue([products, 2]);

      const result = await service.findAll({ page: 1, limit: 10 } as any);

      expect(result.data).toBe(products);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('joins category and orders by createdAt DESC', async () => {
      await service.findAll({ page: 1, limit: 20 } as any);

      expect(productRepo.createQueryBuilder).toHaveBeenCalledWith('p');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('p.category', 'c');
      expect(qb.orderBy).toHaveBeenCalledWith('p.createdAt', 'DESC');
    });

    it('excludes archived products by default (no status param)', async () => {
      await service.findAll({ page: 1, limit: 20 } as any);

      const calls = qb.andWhere.mock.calls.map(([expr]: [string]) => expr);
      expect(calls.some((c) => c.includes('archivedAt IS NULL'))).toBe(true);
      expect(calls.some((c) => c.includes('archivedAt IS NOT NULL'))).toBe(false);
    });

    it('includes only archived when status=archived', async () => {
      await service.findAll({ page: 1, limit: 20, status: 'archived' } as any);

      const calls = qb.andWhere.mock.calls.map(([expr]: [string]) => expr);
      expect(calls.some((c) => c.includes('archivedAt IS NOT NULL'))).toBe(true);
    });

    it('filters by status and excludes archived when status=active', async () => {
      await service.findAll({ page: 1, limit: 20, status: 'active' } as any);

      const calls = qb.andWhere.mock.calls.map(([expr]: [string]) => expr);
      expect(calls.some((c) => c.includes('archivedAt IS NULL'))).toBe(true);
      expect(qb.andWhere).toHaveBeenCalledWith('p.status = :status', { status: 'active' });
    });

    it('filters by categoryId via joined alias', async () => {
      await service.findAll({ page: 1, limit: 20, categoryId: 3 } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('c.id = :categoryId', { categoryId: 3 });
    });

    it('adds JSONB + barcode + code EXISTS search when search provided', async () => {
      await service.findAll({ page: 1, limit: 20, search: 'vase' } as any);

      const [expr, params] = qb.andWhere.mock.calls.find(([e]: [string]) =>
        e.includes('ILIKE'),
      );
      expect(expr).toContain("p.name->>'en' ILIKE :s");
      expect(expr).toContain("p.name->>'nl' ILIKE :s");
      expect(expr).toContain("p.name->>'de' ILIKE :s");
      expect(expr).toContain('p.barcode ILIKE :s');
      expect(expr).toContain('exact_items');
      expect(params.s).toBe('%vase%');
    });

    it('adds direct p.stock > 0 filter for inStock=in_stock (no JOIN)', async () => {
      await service.findAll({ page: 1, limit: 20, inStock: 'in_stock' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('p.stock > 0');
    });

    it('adds p.stock IS NULL OR = 0 filter for inStock=out_of_stock', async () => {
      await service.findAll({ page: 1, limit: 20, inStock: 'out_of_stock' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('(p.stock IS NULL OR p.stock = 0)');
    });

    it('adds low_stock_threshold comparison for inStock=low_stock', async () => {
      await service.findAll({ page: 1, limit: 20, inStock: 'low_stock' } as any);

      const [expr] = qb.andWhere.mock.calls.find(([e]: [string]) =>
        e.includes('lowStockThreshold'),
      );
      expect(expr).toContain('p.stock');
      expect(expr).toContain('p.lowStockThreshold');
    });

    it('applies skip/take for pagination', async () => {
      await service.findAll({ page: 3, limit: 10 } as any);

      expect(qb.skip).toHaveBeenCalledWith(20); // (3-1)*10
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('caps limit at MAX_LIMIT (100)', async () => {
      await service.findAll({ page: 1, limit: 9999 } as any);

      expect(qb.take).toHaveBeenCalledWith(100);
    });
  });
});
