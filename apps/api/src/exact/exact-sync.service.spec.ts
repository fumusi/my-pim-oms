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

const odataPage = <T>(results: T[]): ODataResponse<T> => ({
  d: { results, __next: undefined },
});

type ForEachPageCallback<T> = (items: T[]) => Promise<void> | void;

describe('ExactSyncService', () => {
  let service: ExactSyncService;
  let client: { get: jest.Mock; forEachPage: jest.Mock };
  let itemRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let itemGroupRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    client = {
      get: jest.fn(),
      forEachPage: jest.fn(),
    };
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
      itemRepo.find.mockResolvedValue([{ id: 'item-1' }]);

      // groups sync via forEachPage
      client.forEachPage.mockImplementation(async (_path: string, onPage: ForEachPageCallback<unknown>) => {
        await onPage([makeGroupResponse('grp-1')]);
      });
      // items sync via get ($skip pages)
      client.get
        .mockResolvedValueOnce(odataPage([makeItemResponse('item-1'), makeItemResponse('item-2')]));

      const result = await service.syncProducts();

      expect(result.synced).toBe(2);
      expect(result.created).toBe(1);
      expect(result.updated).toBe(1);
    });

    it('syncs item groups before items (FK dependency)', async () => {
      const callOrder: string[] = [];

      client.forEachPage.mockImplementation(async (path: string, onPage: ForEachPageCallback<unknown>) => {
        callOrder.push(path.includes('ItemGroups') ? 'groups' : 'items');
        await onPage([]);
      });
      client.get.mockResolvedValue(odataPage([]));

      await service.syncProducts();

      expect(callOrder[0]).toBe('groups');
    });

    it('stops item sync after MAX_ITEM_PAGES (3) even if more pages exist', async () => {
      const fullPage = Array.from({ length: 100 }, (_, i) => makeItemResponse(`item-${i}`));

      client.forEachPage.mockResolvedValue(undefined);
      client.get.mockResolvedValue(odataPage(fullPage));

      await service.syncProducts();

      const itemCalls = client.get.mock.calls.filter((args: string[]) =>
        args[0].includes('Items?'),
      );
      expect(itemCalls.length).toBe(3);
    });

    it('stops early when a partial page is returned', async () => {
      const partialPage = [makeItemResponse('item-a'), makeItemResponse('item-b')];

      client.forEachPage.mockResolvedValue(undefined);
      client.get.mockResolvedValueOnce(odataPage(partialPage));

      const result = await service.syncProducts();

      expect(result.synced).toBe(2);
      expect(client.get).toHaveBeenCalledTimes(1);
    });

    it('upserts items via itemRepo.save', async () => {
      client.forEachPage.mockResolvedValue(undefined);
      client.get.mockResolvedValueOnce(odataPage([makeItemResponse('item-x')]));

      await service.syncProducts();

      expect(itemRepo.save).toHaveBeenCalled();
    });

    it('returns all-created summary when no prior items exist', async () => {
      itemRepo.find.mockResolvedValue([]);
      client.forEachPage.mockResolvedValue(undefined);
      client.get.mockResolvedValueOnce(
        odataPage([makeItemResponse('a'), makeItemResponse('b'), makeItemResponse('c')]),
      );

      const result = await service.syncProducts();

      expect(result.synced).toBe(3);
      expect(result.created).toBe(3);
      expect(result.updated).toBe(0);
    });
  });
});
