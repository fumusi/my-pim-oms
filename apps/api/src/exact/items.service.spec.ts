import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ItemsService } from './items.service';
import { ExactItem } from './entities/exact-item.entity';
import { Category } from '../categories/entities/category.entity';
import { UpdatePimTemplateDto } from './dto/update-pim-template.dto';

// ── Helpers ─────────────────────────────────────────────────────────────────

const makeItem = (overrides: Partial<ExactItem> = {}): ExactItem =>
  ({
    id: 'item-uuid-1',
    description: 'Test item',
    code: 'SKU-1',
    isSalesItem: true,
    stock: null,
    standardSalesPrice: null,
    itemGroupDescription: null,
    itemGroup: null,
    category: null,
    pimTemplate: null,
    updatedBy: null,
    ...overrides,
  }) as ExactItem;

const makeCategory = (overrides: Partial<Category> = {}): Category =>
  ({
    id: 1,
    name: { nl: 'Test', en: 'Test', de: 'Test' },
    description: null,
    image: null,
    icon: null,
    status: 'active' as const,
    template: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    updatedBy: null,
    archivedAt: null,
    ...overrides,
  }) as Category;

// Chainable QB mock — every method returns `this` unless overridden per test.
function makeQb() {
  const qb: Record<string, jest.Mock> = {
    select: jest.fn(),
    addSelect: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    leftJoinAndSelect: jest.fn(),
    setLock: jest.fn(),
    groupBy: jest.fn(),
    update: jest.fn(),
    set: jest.fn(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getCount: jest.fn().mockResolvedValue(0),
    execute: jest.fn().mockResolvedValue(undefined),
  };
  // Make all non-terminal methods chainable.
  const terminals = new Set(['getRawMany', 'getManyAndCount', 'getCount', 'execute']);
  for (const key of Object.keys(qb)) {
    if (!terminals.has(key)) {
      qb[key].mockReturnValue(qb);
    }
  }
  return qb;
}

// ── Describe ─────────────────────────────────────────────────────────────────

describe('ItemsService', () => {
  let service: ItemsService;
  let qb: ReturnType<typeof makeQb>;

  const emQuery = jest.fn();
  const em = {
    createQueryBuilder: jest.fn(),
    query: emQuery,
  };

  const repo = {
    createQueryBuilder: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    manager: {
      transaction: jest.fn().mockImplementation((cb: (em: typeof em) => unknown) => cb(em)),
      createQueryBuilder: jest.fn(),
    },
  };

  const categoryRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    qb = makeQb();
    repo.createQueryBuilder.mockReturnValue(qb);
    em.createQueryBuilder.mockReturnValue(qb);
    repo.manager.createQueryBuilder.mockReturnValue(qb);
    repo.manager.transaction.mockImplementation((cb: (em: typeof em) => unknown) => cb(em));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        { provide: getRepositoryToken(ExactItem), useValue: repo },
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
      ],
    }).compile();

    service = module.get(ItemsService);
    jest.clearAllMocks();
    // Re-wire after clearAllMocks.
    qb = makeQb();
    repo.createQueryBuilder.mockReturnValue(qb);
    em.createQueryBuilder.mockReturnValue(qb);
    repo.manager.createQueryBuilder.mockReturnValue(qb);
    repo.manager.transaction.mockImplementation((cb: (em: typeof em) => unknown) => cb(em));
  });

  // ── assignToCategory ──────────────────────────────────────────────────────

  describe('assignToCategory', () => {
    it('assigns eligible products and returns the count', async () => {
      qb.getRawMany.mockResolvedValue([
        { id: 'a', category_id: null },
        { id: 'b', category_id: null },
      ]);
      emQuery.mockResolvedValue(undefined);

      const result = await service.assignToCategory(['a', 'b'], 1, null);

      expect(result.assigned).toBe(2);
      expect(result.skipped).toHaveLength(0);
      expect(emQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE exact_items'),
        expect.arrayContaining([1, null, ['a', 'b']]),
      );
    });

    it('skips products not found in the database', async () => {
      qb.getRawMany.mockResolvedValue([{ id: 'a', category_id: null }]);

      const result = await service.assignToCategory(['a', 'missing'], 1, null);

      expect(result.assigned).toBe(1);
      expect(result.skipped).toEqual([{ id: 'missing', reason: 'product not found' }]);
    });

    it('skips products already assigned to the target category', async () => {
      qb.getRawMany.mockResolvedValue([
        { id: 'a', category_id: '1' },
        { id: 'b', category_id: null },
      ]);
      emQuery.mockResolvedValue(undefined);

      const result = await service.assignToCategory(['a', 'b'], 1, null);

      expect(result.assigned).toBe(1);
      expect(result.skipped).toEqual([{ id: 'a', reason: 'already assigned to this category' }]);
    });

    it('allows re-assigning a product that is in a different category', async () => {
      qb.getRawMany.mockResolvedValue([{ id: 'a', category_id: '99' }]);
      emQuery.mockResolvedValue(undefined);

      const result = await service.assignToCategory(['a'], 1, null);

      expect(result.assigned).toBe(1);
      expect(result.skipped).toHaveLength(0);
    });

    it('does not call UPDATE when all products are skipped', async () => {
      qb.getRawMany.mockResolvedValue([{ id: 'a', category_id: '1' }]);

      const result = await service.assignToCategory(['a'], 1, null);

      expect(result.assigned).toBe(0);
      expect(emQuery).not.toHaveBeenCalled();
    });

    it('serialises the category template into the UPDATE call', async () => {
      const template = { voltage: null, weight: null };
      qb.getRawMany.mockResolvedValue([{ id: 'a', category_id: null }]);
      emQuery.mockResolvedValue(undefined);

      await service.assignToCategory(['a'], 1, template);

      expect(emQuery).toHaveBeenCalledWith(
        expect.any(String),
        [1, JSON.stringify(template), ['a']],
      );
    });
  });

  // ── unassignFromCategory ──────────────────────────────────────────────────

  describe('unassignFromCategory', () => {
    it('returns 0 immediately for an empty product list', async () => {
      const result = await service.unassignFromCategory([], 1);

      expect(result).toBe(0);
      expect(repo.manager.transaction).not.toHaveBeenCalled();
    });

    it('unassigns products and returns the count', async () => {
      qb.getRawMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
      emQuery.mockResolvedValue(undefined);

      const result = await service.unassignFromCategory(['a', 'b'], 1);

      expect(result).toBe(2);
      expect(emQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE exact_items SET category_id = NULL, pim_template = NULL'),
        [['a', 'b']],
      );
    });

    it('returns 0 when none of the products belong to the category', async () => {
      qb.getRawMany.mockResolvedValue([]);

      const result = await service.unassignFromCategory(['x', 'y'], 1);

      expect(result).toBe(0);
      expect(emQuery).not.toHaveBeenCalled();
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates an item without a category', async () => {
      const built = makeItem();
      repo.create.mockReturnValue(built);
      repo.save.mockResolvedValue(built);

      const result = await service.create({ description: 'Widget' }, 'admin@test.com');

      expect(categoryRepo.findOne).not.toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Widget', isSalesItem: true, updatedBy: 'admin@test.com' }),
      );
      expect(result).toBe(built);
    });

    it('fetches the category and copies its template when categoryId is provided', async () => {
      const cat = makeCategory({ template: { voltage: null } });
      categoryRepo.findOne.mockResolvedValue(cat);
      const built = makeItem({ category: cat, pimTemplate: cat.template });
      repo.create.mockReturnValue(built);
      repo.save.mockResolvedValue(built);

      await service.create({ description: 'Widget', categoryId: 1 }, 'admin@test.com');

      expect(categoryRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: cat, pimTemplate: cat.template }),
      );
    });

    it('throws NotFoundException when categoryId does not exist', async () => {
      categoryRepo.findOne.mockResolvedValue(null);

      await expect(service.create({ description: 'Widget', categoryId: 99 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  // ── updatePimTemplate ─────────────────────────────────────────────────────

  describe('updatePimTemplate', () => {
    it('updates pimTemplate and updatedBy then saves', async () => {
      const item = makeItem();
      repo.findOneOrFail.mockResolvedValue(item);
      repo.save.mockImplementation((i: ExactItem) => Promise.resolve(i));

      const dto = { pimTemplate: { voltage: '220V' } } as UpdatePimTemplateDto;
      await service.updatePimTemplate('item-uuid-1', dto, 'editor@test.com');

      expect(item.pimTemplate).toEqual({ voltage: '220V' });
      expect(item.updatedBy).toBe('editor@test.com');
      expect(repo.save).toHaveBeenCalledWith(item);
    });

    it('accepts null pimTemplate to clear the template', async () => {
      const item = makeItem({ pimTemplate: { voltage: null } });
      repo.findOneOrFail.mockResolvedValue(item);
      repo.save.mockImplementation((i: ExactItem) => Promise.resolve(i));

      await service.updatePimTemplate('item-uuid-1', { pimTemplate: null } as UpdatePimTemplateDto);

      expect(item.pimTemplate).toBeNull();
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated results with meta', async () => {
      const items = [makeItem()];
      qb.getManyAndCount.mockResolvedValue([items, 1]);

      const result = await service.findAll(1, 20);

      expect(result.data).toBe(items);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('does NOT join category when withCategory is false (default)', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 20);

      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('item.itemGroup', 'itemGroup');
      expect(qb.leftJoinAndSelect).not.toHaveBeenCalledWith('item.category', 'category');
    });

    it('joins category when withCategory is true', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 20, undefined, undefined, true);

      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('item.category', 'category');
    });

    it('applies excludeCategoryId filter', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 20, 5);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('category_id'),
        { cid: 5 },
      );
    });

    it('applies ILIKE search filter', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 20, undefined, 'widget');

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { s: '%widget%' },
      );
    });

    it('caps limit at MAX_LIMIT (100)', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 9999);

      expect(qb.take).toHaveBeenCalledWith(100);
    });
  });

  // ── findByCategoryId ──────────────────────────────────────────────────────

  describe('findByCategoryId', () => {
    it('returns products for a category with pagination', async () => {
      const items = [makeItem()];
      qb.getManyAndCount.mockResolvedValue([items, 7]);

      const result = await service.findByCategoryId(1, 1, 20);

      expect(result.data).toBe(items);
      expect(result.meta.total).toBe(7);
      expect(result.meta.totalPages).toBe(1);
    });

    it('applies ILIKE search filter when provided', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findByCategoryId(1, 1, 20, 'bolt');

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { s: '%bolt%' },
      );
    });

    it('does not apply search filter when search is absent', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findByCategoryId(1, 1, 20);

      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  // ── countByCategory ───────────────────────────────────────────────────────

  describe('countByCategory', () => {
    it('returns the product count for a category', async () => {
      qb.getCount.mockResolvedValue(7);

      const result = await service.countByCategory(1);

      expect(result).toBe(7);
    });
  });

  // ── countsByCategoryIds ───────────────────────────────────────────────────

  describe('countsByCategoryIds', () => {
    it('returns an empty map for an empty id list', async () => {
      const result = await service.countsByCategoryIds([]);
      expect(result.size).toBe(0);
    });

    it('returns a map keyed by category id with counts', async () => {
      qb.getRawMany.mockResolvedValue([
        { categoryId: '1', count: '3' },
        { categoryId: '2', count: '0' },
      ]);

      const result = await service.countsByCategoryIds([1, 2]);

      expect(result.get(1)).toBe(3);
      expect(result.get(2)).toBe(0);
    });
  });
});
