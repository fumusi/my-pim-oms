import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { ExactItem } from '../exact/entities/exact-item.entity';
import { CategoryStatus } from '../common/enums/category-status.enum';

const makeCategory = (overrides: Partial<Category> = {}): Category =>
  ({
    id: 1,
    name: { nl: 'Categorie', en: 'Category', de: 'Kategorie' },
    description: null,
    image: null,
    icon: null,
    status: CategoryStatus.Active,
    template: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    updatedBy: null,
    archivedAt: null,
    products: [],
    ...overrides,
  }) as Category;

const makeQbMock = () => {
  const qb: Record<string, jest.Mock> = {};
  qb.update = jest.fn().mockReturnValue(qb);
  qb.set = jest.fn().mockReturnValue(qb);
  qb.where = jest.fn().mockReturnValue(qb);
  qb.execute = jest.fn().mockResolvedValue({ affected: 0 });
  return qb;
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  const categoryRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const itemRepo = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
        { provide: getRepositoryToken(ExactItem), useValue: itemRepo },
      ],
    }).compile();

    service = module.get(CategoriesService);
    jest.clearAllMocks();
  });

  // ── setStatus ──────────────────────────────────────────────────────────────

  describe('setStatus → inactive', () => {
    it('saves the category with new status and updatedBy', async () => {
      const cat = makeCategory();
      categoryRepo.findOneOrFail.mockResolvedValue(cat);
      categoryRepo.save.mockImplementation((c: Category) => Promise.resolve(c));
      const qb = makeQbMock();
      itemRepo.createQueryBuilder.mockReturnValue(qb);

      await service.setStatus(1, CategoryStatus.Inactive, 'admin@test.com');

      expect(cat.status).toBe(CategoryStatus.Inactive);
      expect(cat.updatedBy).toBe('admin@test.com');
      expect(categoryRepo.save).toHaveBeenCalledWith(cat);
    });

    it('runs mass-update on items when setting to inactive', async () => {
      const cat = makeCategory();
      categoryRepo.findOneOrFail.mockResolvedValue(cat);
      categoryRepo.save.mockImplementation((c: Category) => Promise.resolve(c));
      const qb = makeQbMock();
      itemRepo.createQueryBuilder.mockReturnValue(qb);

      await service.setStatus(1, CategoryStatus.Inactive);

      expect(itemRepo.createQueryBuilder).toHaveBeenCalled();
      expect(qb.set).toHaveBeenCalledWith({ isSalesItem: false });
      expect(qb.where).toHaveBeenCalledWith('"category_id" = :id', { id: 1 });
      expect(qb.execute).toHaveBeenCalled();
    });

    it('does NOT touch items when setting to active', async () => {
      const cat = makeCategory({ status: CategoryStatus.Inactive });
      categoryRepo.findOneOrFail.mockResolvedValue(cat);
      categoryRepo.save.mockImplementation((c: Category) => Promise.resolve(c));

      await service.setStatus(1, CategoryStatus.Active);

      expect(itemRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  // ── delete ─────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('throws 400 with assigned product count when products exist', async () => {
      itemRepo.count.mockResolvedValue(3);

      await expect(service.delete(1)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.delete(1)).rejects.toMatchObject({
        message: 'Cannot delete category: 3 products still assigned',
      });
      expect(categoryRepo.delete).not.toHaveBeenCalled();
    });

    it('uses singular form when exactly 1 product assigned', async () => {
      itemRepo.count.mockResolvedValue(1);

      await expect(service.delete(1)).rejects.toMatchObject({
        message: 'Cannot delete category: 1 product still assigned',
      });
    });

    it('deletes category when no products are assigned', async () => {
      itemRepo.count.mockResolvedValue(0);
      categoryRepo.delete.mockResolvedValue({ affected: 1 });

      await service.delete(1);

      expect(categoryRepo.delete).toHaveBeenCalledWith(1);
    });
  });

  // ── archive ────────────────────────────────────────────────────────────────

  describe('archive', () => {
    it('sets archivedAt to now and saves', async () => {
      const cat = makeCategory();
      categoryRepo.findOneOrFail.mockResolvedValue(cat);
      categoryRepo.save.mockImplementation((c: Category) => Promise.resolve(c));
      const before = new Date();

      await service.archive(1, 'admin@test.com');

      expect(cat.archivedAt).toBeInstanceOf(Date);
      expect(cat.archivedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(cat.updatedBy).toBe('admin@test.com');
    });
  });
});
