import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ExactSyncService } from './exact-sync.service';
import { ExactOnlineClientService } from './exact-online-client.service';
import { ExactItem } from './entities/exact-item.entity';
import { ExactItemGroup } from './entities/exact-item-group.entity';
import type { ExactItemResponse, ExactItemGroupResponse } from './types';

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

type ForEachPageCallback<T> = (items: T[]) => Promise<void> | void;

function makeForEachPageMock(
  groupItems: ExactItemGroupResponse[],
  productItems: ExactItemResponse[],
) {
  return async (path: string, onPage: ForEachPageCallback<unknown>) => {
    if (path.includes('ItemGroups')) {
      await onPage(groupItems);
    } else {
      await onPage(productItems);
    }
  };
}

function makeQbMock(executeResult: Promise<unknown> = Promise.resolve({})) {
  const qb = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orUpdate: jest.fn().mockReturnThis(),
    execute: jest.fn().mockReturnValue(executeResult),
  };
  return qb;
}

describe('ExactSyncService', () => {
  let service: ExactSyncService;
  let client: { forEachPage: jest.Mock };
  let itemRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let itemGroupRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let qb: ReturnType<typeof makeQbMock>;
  let dataSource: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    client = { forEachPage: jest.fn() };
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
    qb = makeQbMock();
    dataSource = { createQueryBuilder: jest.fn().mockReturnValue(qb) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExactSyncService,
        { provide: ExactOnlineClientService, useValue: client },
        { provide: getRepositoryToken(ExactItem), useValue: itemRepo },
        { provide: getRepositoryToken(ExactItemGroup), useValue: itemGroupRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(ExactSyncService);
  });

  describe('syncProducts', () => {
    it('returns summary with correct created/updated counts', async () => {
      itemRepo.find.mockResolvedValue([{ id: 'item-1' }]);
      client.forEachPage.mockImplementation(
        makeForEachPageMock(
          [makeGroupResponse('grp-1')],
          [makeItemResponse('item-1'), makeItemResponse('item-2')],
        ),
      );

      const result = await service.syncProducts();

      expect(result.synced).toBe(2);
      expect(result.created).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.errors).toEqual([]);
    });

    it('syncs item groups before items (FK dependency)', async () => {
      const callOrder: string[] = [];
      client.forEachPage.mockImplementation(async (path: string) => {
        callOrder.push(path.includes('ItemGroups') ? 'groups' : 'items');
      });

      await service.syncProducts();

      expect(callOrder[0]).toBe('groups');
      expect(callOrder[1]).toBe('items');
    });

    it('passes MAX_ITEM_PAGES cap (3) to forEachPage for items', async () => {
      client.forEachPage.mockResolvedValue(undefined);

      await service.syncProducts();

      const itemCall = client.forEachPage.mock.calls.find(([path]: [string]) =>
        path.includes('Items?'),
      );
      expect(itemCall?.[3]).toBe(3);
    });

    it('handles empty page responses gracefully', async () => {
      client.forEachPage.mockImplementation(makeForEachPageMock([], []));

      const result = await service.syncProducts();

      expect(result.synced).toBe(0);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('upserts items via itemRepo.save', async () => {
      client.forEachPage.mockImplementation(
        makeForEachPageMock([], [makeItemResponse('item-x')]),
      );

      await service.syncProducts();

      expect(itemRepo.save).toHaveBeenCalled();
    });

    it('uses orUpdate with exact DB column names on conflict', async () => {
      client.forEachPage.mockImplementation(
        makeForEachPageMock([], [makeItemResponse('item-x')]),
      );

      await service.syncProducts();

      expect(qb.orUpdate).toHaveBeenCalledWith(
        expect.arrayContaining(['barcode', 'currency', 'base_price', 'purchase_price', 'sales_vat_code']),
        ['exact_id'],
      );
      const [updatedCols] = qb.orUpdate.mock.calls[0];
      expect(updatedCols).not.toContain('name');
      expect(updatedCols).not.toContain('weight');
    });

    it('inserts name and weight (seeded from Exact for initial INSERT)', async () => {
      client.forEachPage.mockImplementation(
        makeForEachPageMock([], [
          makeItemResponse('item-x', {
            Description: 'Ceramic Vase',
            NetWeight: 0.5,
            Barcode: 'BAR-1',
            CostPriceCurrency: 'EUR',
            StandardSalesPrice: 9.99,
            CostPriceStandard: 5.0,
            SalesVatCode: 'V21',
          }),
        ]),
      );

      await service.syncProducts();

      const [values] = qb.values.mock.calls[0];
      const product = values[0];
      expect(product.exactId).toBe('item-x');
      expect(product.barcode).toBe('BAR-1');
      expect(product.currency).toBe('EUR');
      expect(product.basePrice).toBe(9.99);
      expect(product.purchasePrice).toBe(5.0);
      expect(product.salesVatCode).toBe('V21');
      expect(product.name).toEqual({ en: 'Ceramic Vase' });
      expect(product.weight).toBe(0.5);
      expect(product.status).toBeUndefined();
    });

    it('captures per-product errors without stopping the sync', async () => {
      client.forEachPage.mockImplementation(
        makeForEachPageMock([], [makeItemResponse('ok-item'), makeItemResponse('bad-item')]),
      );
      qb.execute
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('FK violation'));

      const result = await service.syncProducts();

      expect(result.synced).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].exactId).toBe('bad-item');
      expect(result.errors[0].message).toBe('FK violation');
    });

    it('does not call QB on empty item page', async () => {
      client.forEachPage.mockImplementation(makeForEachPageMock([], []));

      await service.syncProducts();

      expect(dataSource.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('returns all-created summary when no prior items exist', async () => {
      itemRepo.find.mockResolvedValue([]);
      client.forEachPage.mockImplementation(
        makeForEachPageMock([], [makeItemResponse('a'), makeItemResponse('b'), makeItemResponse('c')]),
      );

      const result = await service.syncProducts();

      expect(result.synced).toBe(3);
      expect(result.created).toBe(3);
      expect(result.updated).toBe(0);
      expect(result.errors).toEqual([]);
    });
  });
});
