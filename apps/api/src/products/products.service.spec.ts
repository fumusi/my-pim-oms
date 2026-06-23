import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { ProductStatus } from '../common/enums/product-status.enum';

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
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let categoryRepo: { findOneBy: jest.Mock };

  beforeEach(async () => {
    productRepo = {
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
});
