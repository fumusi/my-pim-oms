import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExactSyncService } from './exact-sync.service';
import { ExactOnlineClientService } from './exact-online-client.service';
import { ExactItem } from './entities/exact-item.entity';
import { ExactItemGroup } from './entities/exact-item-group.entity';
import type { ExactItemResponse, ExactItemGroupResponse, ODataResponse } from './types';

const makeItemResponse = (id: string, overrides: Partial<ExactItemResponse> = {}): ExactItemResponse => ({
  ID: id,
  Code: `CODE-${id}`,
  Description: `Item ${id}`,
  Division: 1,
  StandardSalesPrice: 10.0,
  CostPriceStandard: null,
  CostPriceCurrency: null,
  IsBatchNumberItem: null,
  IsBatchItem: null,
  IsFractionAllowedItem: null,
  IsPackageItem: null,
  IsPurchaseItem: null,
  IsSalesItem: null,
  IsSerialItem: null,
  IsStockItem: null,
  IsWebshopItem: null,
  IsSerialNumberItem: null,
  IsTaxableItem: null,
  Barcode: null,
  ExtraDescription: null,
  Notes: null,
  SearchCode: null,
  AverageCost: null,
  GrossWeight: null,
  NetWeight: null,
  NetWeightUnit: null,
  ItemGroup: null,
  ItemGroupCode: null,
  ItemGroupDescription: null,
  SalesVatCode: null,
  SalesVatCodeDescription: null,
  StartDate: null,
  EndDate: null,
  Stock: null,
  Unit: null,
  UnitDescription: null,
  UnitType: null,
  PictureUrl: null,
  PictureThumbnailUrl: null,
  Creator: null,
  CreatorFullName: null,
  Modifier: null,
  ModifierFullName: null,
  Created: null,
  Modified: null,
  ...overrides,
});

const makeGroupResponse = (id: string): ExactItemGroupResponse => ({
  ID: id,
  Code: `GRP-${id}`,
  Description: `Group ${id}`,
  Division: 1,
  GLCosts: null,
  GLCostsCode: null,
  GLCostsDescription: null,
  GLRevenue: null,
  GLRevenueCode: null,
  GLRevenueDescription: null,
  GLStock: null,
  GLStockCode: null,
  GLStockDescription: null,
  Creator: null,
  CreatorFullName: null,
  Modifier: null,
  IsDefault: null,
  Created: null,
  Modified: null,
});

const odataPage = <T>(results: T[], hasNext = false): ODataResponse<T> => ({
  d: { results, __next: hasNext ? 'https://next-page-url' : undefined },
});

describe('ExactSyncService', () => {
  let service: ExactSyncService;
  let client: { get: jest.Mock };
  let itemRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let itemGroupRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    client = { get: jest.fn() };
    itemRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockResolvedValue([]),
    };
    itemGroupRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExactSyncService,
        { provide: ExactOnlineClientService, useValue: client },
        { provide: getRepositoryToken(ExactItem), useValue: itemRepo },
        { provide: getRepositoryToken(ExactItemGroup), useValue: itemGroupRepo },
      ],
    }).compile();

    service = module.get(ExactSyncService);
  });

  describe('syncProducts', () => {
    it('returns summary with correct created/updated counts', async () => {
      // item-1 already exists, item-2 is new
      itemRepo.find.mockResolvedValue([{ id: 'item-1' }]);

      client.get
        // item groups: 1 group < PAGE_SIZE → breaks after one call
        .mockResolvedValueOnce(odataPage([makeGroupResponse('grp-1')]))
        // items page 1
        .mockResolvedValueOnce(odataPage([makeItemResponse('item-1'), makeItemResponse('item-2')]));

      const result = await service.syncProducts();

      expect(result.synced).toBe(2);
      expect(result.created).toBe(1);
      expect(result.updated).toBe(1);
    });

    it('syncs item groups before items (FK dependency)', async () => {
      const callOrder: string[] = [];

      client.get.mockImplementation((path: string) => {
        if (path.includes('ItemGroups')) {
          callOrder.push('groups');
          return Promise.resolve(odataPage([]));
        }
        callOrder.push('items');
        return Promise.resolve(odataPage([]));
      });

      await service.syncProducts();

      expect(callOrder[0]).toBe('groups');
    });

    it('stops item sync after MAX_ITEM_PAGES (3) even if more pages exist', async () => {
      // Make every page return 100 items (full page = more pages exist)
      const fullPage = Array.from({ length: 100 }, (_, i) => makeItemResponse(`item-${i}`));

      client.get
        .mockResolvedValueOnce(odataPage([]))  // item groups: empty
        .mockResolvedValue(odataPage(fullPage)); // all item calls return full pages

      await service.syncProducts();

      const itemCalls = (client.get as jest.Mock).mock.calls.filter((args: string[]) =>
        args[0].includes('Items?'),
      );
      expect(itemCalls.length).toBe(3);
    });

    it('stops early when a partial page is returned', async () => {
      const partialPage = [makeItemResponse('item-a'), makeItemResponse('item-b')];

      client.get
        .mockResolvedValueOnce(odataPage([])) // item groups empty
        .mockResolvedValueOnce(odataPage(partialPage)); // 2 items < 100

      const result = await service.syncProducts();

      expect(result.synced).toBe(2);
      const itemCalls = (client.get as jest.Mock).mock.calls.filter((args: string[]) =>
        args[0].includes('Items?'),
      );
      expect(itemCalls.length).toBe(1);
    });

    it('upserts items via itemRepo.save', async () => {
      client.get
        .mockResolvedValueOnce(odataPage([]))
        .mockResolvedValueOnce(odataPage([makeItemResponse('item-x')]));

      await service.syncProducts();

      expect(itemRepo.save).toHaveBeenCalled();
    });

    it('returns all-created summary when no prior items exist', async () => {
      itemRepo.find.mockResolvedValue([]);
      client.get
        .mockResolvedValueOnce(odataPage([]))
        .mockResolvedValueOnce(odataPage([makeItemResponse('a'), makeItemResponse('b'), makeItemResponse('c')]));

      const result = await service.syncProducts();

      expect(result.synced).toBe(3);
      expect(result.created).toBe(3);
      expect(result.updated).toBe(0);
    });
  });
});
