import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { ItemsService } from '../exact/items.service';
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
    ...overrides,
  }) as Category;

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

  const itemsService = {
    countByCategory: jest.fn(),
    deactivateByCategoryId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
        { provide: ItemsService, useValue: itemsService },
      ],
    }).compile();

    service = module.get(CategoriesService);
    jest.clearAllMocks();
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a category and wires updatedBy', async () => {
      const data = { name: { nl: 'Test', en: 'Test', de: 'Test' } };
      const built = makeCategory(data);
      categoryRepo.create.mockReturnValue(built);
      categoryRepo.save.mockResolvedValue(built);

      const result = await service.create(data, 'admin@test.com');

      expect(categoryRepo.create).toHaveBeenCalledWith({ ...data, updatedBy: 'admin@test.com' });
      expect(result).toBe(built);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('merges data, sets updatedBy, and saves', async () => {
      const cat = makeCategory();
      categoryRepo.findOneOrFail.mockResolvedValue(cat);
      categoryRepo.save.mockImplementation((c: Category) => Promise.resolve(c));

      await service.update(1, { image: 'https://example.com/img.png' }, 'admin@test.com');

      expect(cat.image).toBe('https://example.com/img.png');
      expect(cat.updatedBy).toBe('admin@test.com');
      expect(categoryRepo.save).toHaveBeenCalledWith(cat);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns null for a non-existent id', async () => {
      categoryRepo.findOne.mockResolvedValue(null);
      const result = await service.findOne(999);
      expect(result).toBeNull();
    });
  });

  // ── setStatus ──────────────────────────────────────────────────────────────

  describe('setStatus → inactive', () => {
    it('saves the category with new status and updatedBy', async () => {
      const cat = makeCategory();
      categoryRepo.findOneOrFail.mockResolvedValue(cat);
      categoryRepo.save.mockImplementation((c: Category) => Promise.resolve(c));
      itemsService.deactivateByCategoryId.mockResolvedValue(undefined);

      await service.setStatus(1, CategoryStatus.Inactive, 'admin@test.com');

      expect(cat.status).toBe(CategoryStatus.Inactive);
      expect(cat.updatedBy).toBe('admin@test.com');
      expect(categoryRepo.save).toHaveBeenCalledWith(cat);
    });

    it('calls deactivateByCategoryId when setting to inactive', async () => {
      const cat = makeCategory();
      categoryRepo.findOneOrFail.mockResolvedValue(cat);
      categoryRepo.save.mockImplementation((c: Category) => Promise.resolve(c));
      itemsService.deactivateByCategoryId.mockResolvedValue(undefined);

      await service.setStatus(1, CategoryStatus.Inactive);

      expect(itemsService.deactivateByCategoryId).toHaveBeenCalledWith(1);
    });

    it('does NOT call deactivateByCategoryId when setting to active', async () => {
      const cat = makeCategory({ status: CategoryStatus.Inactive });
      categoryRepo.findOneOrFail.mockResolvedValue(cat);
      categoryRepo.save.mockImplementation((c: Category) => Promise.resolve(c));

      await service.setStatus(1, CategoryStatus.Active);

      expect(itemsService.deactivateByCategoryId).not.toHaveBeenCalled();
    });
  });

  // ── delete ─────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('throws 400 with assigned product count when products exist', async () => {
      itemsService.countByCategory.mockResolvedValue(3);

      await expect(service.delete(1)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.delete(1)).rejects.toMatchObject({
        message: 'Cannot delete category: 3 products still assigned',
      });
      expect(categoryRepo.delete).not.toHaveBeenCalled();
    });

    it('uses singular form when exactly 1 product assigned', async () => {
      itemsService.countByCategory.mockResolvedValue(1);

      await expect(service.delete(1)).rejects.toMatchObject({
        message: 'Cannot delete category: 1 product still assigned',
      });
    });

    it('deletes category when no products are assigned', async () => {
      itemsService.countByCategory.mockResolvedValue(0);
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

    it('is a no-op if already archived', async () => {
      const original = new Date('2024-01-01');
      const cat = makeCategory({ archivedAt: original });
      categoryRepo.findOneOrFail.mockResolvedValue(cat);

      const result = await service.archive(1, 'admin@test.com');

      expect(result.archivedAt).toBe(original);
      expect(categoryRepo.save).not.toHaveBeenCalled();
    });
  });
});
