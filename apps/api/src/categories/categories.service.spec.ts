import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { EntityNotFoundError } from 'typeorm';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { ItemsService } from '../exact/items.service';
import { CategoryStatus } from '../common/enums/category-status.enum';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

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

  // EntityManager used inside transactions
  const em = {
    findOneOrFail: jest.fn(),
    save: jest.fn(),
  };

  const categoryRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    manager: {
      transaction: jest.fn().mockImplementation((cb) => cb(em)),
    },
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
    // Re-wire transaction mock after clearAllMocks resets it
    categoryRepo.manager.transaction.mockImplementation((cb) => cb(em));
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a category and wires updatedBy', async () => {
      const dto: CreateCategoryDto = { name: { nl: 'Test', en: 'Test', de: 'Test' } };
      const built = makeCategory(dto);
      categoryRepo.create.mockReturnValue(built);
      categoryRepo.save.mockResolvedValue(built);

      const result = await service.create(dto, 'admin@test.com');

      expect(categoryRepo.create).toHaveBeenCalledWith({ ...dto, updatedBy: 'admin@test.com' });
      expect(result).toBe(built);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('merges data, sets updatedBy, and saves', async () => {
      const cat = makeCategory();
      const dto: UpdateCategoryDto = { image: 'https://example.com/img.png' };
      categoryRepo.findOneOrFail.mockResolvedValue(cat);
      categoryRepo.save.mockImplementation((c: Category) => Promise.resolve(c));

      await service.update(1, dto, 'admin@test.com');

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
    it('saves the category with new status and updatedBy inside a transaction', async () => {
      const cat = makeCategory();
      em.findOneOrFail.mockResolvedValue(cat);
      em.save.mockImplementation((c: Category) => Promise.resolve(c));
      itemsService.deactivateByCategoryId.mockResolvedValue(undefined);

      await service.setStatus(1, CategoryStatus.Inactive, 'admin@test.com');

      expect(categoryRepo.manager.transaction).toHaveBeenCalled();
      expect(cat.status).toBe(CategoryStatus.Inactive);
      expect(cat.updatedBy).toBe('admin@test.com');
      expect(em.save).toHaveBeenCalledWith(cat);
    });

    it('calls deactivateByCategoryId with the transaction em when setting to inactive', async () => {
      const cat = makeCategory();
      em.findOneOrFail.mockResolvedValue(cat);
      em.save.mockImplementation((c: Category) => Promise.resolve(c));
      itemsService.deactivateByCategoryId.mockResolvedValue(undefined);

      await service.setStatus(1, CategoryStatus.Inactive);

      expect(itemsService.deactivateByCategoryId).toHaveBeenCalledWith(1, em);
    });

    it('does NOT call deactivateByCategoryId when setting to active', async () => {
      const cat = makeCategory({ status: CategoryStatus.Inactive });
      em.findOneOrFail.mockResolvedValue(cat);
      em.save.mockImplementation((c: Category) => Promise.resolve(c));

      await service.setStatus(1, CategoryStatus.Active);

      expect(itemsService.deactivateByCategoryId).not.toHaveBeenCalled();
    });
  });

  // ── delete ─────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('throws EntityNotFoundError for a non-existent category', async () => {
      categoryRepo.findOneOrFail.mockRejectedValue(new EntityNotFoundError(Category, { id: 999 }));

      await expect(service.delete(999)).rejects.toBeInstanceOf(EntityNotFoundError);
      expect(itemsService.countByCategory).not.toHaveBeenCalled();
    });

    it('throws 400 with assigned product count when products exist', async () => {
      categoryRepo.findOneOrFail.mockResolvedValue(makeCategory());
      itemsService.countByCategory.mockResolvedValue(3);

      await expect(service.delete(1)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.delete(1)).rejects.toMatchObject({
        message: 'Cannot delete category: 3 products still assigned',
      });
      expect(categoryRepo.delete).not.toHaveBeenCalled();
    });

    it('uses singular form when exactly 1 product assigned', async () => {
      categoryRepo.findOneOrFail.mockResolvedValue(makeCategory());
      itemsService.countByCategory.mockResolvedValue(1);

      await expect(service.delete(1)).rejects.toMatchObject({
        message: 'Cannot delete category: 1 product still assigned',
      });
    });

    it('deletes category when no products are assigned', async () => {
      categoryRepo.findOneOrFail.mockResolvedValue(makeCategory());
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
