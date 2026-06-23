import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExactSyncService } from './exact-sync.service';
import { ExactOnlineClientService } from './exact-online-client.service';
import { ExactItem } from './entities/exact-item.entity';
import { ExactItemGroup } from './entities/exact-item-group.entity';
import { Product } from '../products/entities/product.entity';
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

// Dispatches forEachPage calls to the right fixture based on the URL path.
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

describe('ExactSyncService', () => {
  let service: ExactSyncService;
  let client: { forEachPage: jest.Mock };
  let itemRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let itemGroupRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let productRepo: { upsert: jest.Mock };

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
    productRepo = {
      upsert: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExactSyncService,
        { provide: ExactOnlineClientService, useValue: client },
        { provide: getRepositoryToken(ExactItem), useValue: itemRepo },
        { provide: getRepositoryToken(ExactItemGroup), useValue: itemGroupRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
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
    });

    it('upserts items via itemRepo.save', async () => {
      client.forEachPage.mockImplementation(
        makeForEachPageMock([], [makeItemResponse('item-x')]),
      );

      await service.syncProducts();

      expect(itemRepo.save).toHaveBeenCalled();
    });

    it('upserts products with conflictPaths exactId after saving exact_items', async () => {
      client.forEachPage.mockImplementation(
        makeForEachPageMock([], [makeItemResponse('item-x')]),
      );

      await service.syncProducts();

      expect(productRepo.upsert).toHaveBeenCalled();
      const [, options] = productRepo.upsert.mock.calls[0];
      expect(options).toEqual({ conflictPaths: ['exactId'] });
    });

    it('maps only Exact-sourced fields into the products upsert', async () => {
      client.forEachPage.mockImplementation(
        makeForEachPageMock([], [
          makeItemResponse('item-x', {
            Barcode: 'BAR-1',
            CostPriceCurrency: 'EUR',
            StandardSalesPrice: 9.99,
            CostPriceStandard: 5.0,
            SalesVatCode: 'V21',
          }),
        ]),
      );

      await service.syncProducts();

      const [entities] = productRepo.upsert.mock.calls[0];
      expect(entities[0].exactId).toBe('item-x');
      expect(entities[0].barcode).toBe('BAR-1');
      expect(entities[0].currency).toBe('EUR');
      expect(entities[0].basePrice).toBe(9.99);
      expect(entities[0].purchasePrice).toBe(5.0);
      expect(entities[0].salesVatCode).toBe('V21');
      expect(entities[0].status).toBeUndefined();
    });

    it('does not call productRepo.upsert on empty item page', async () => {
      client.forEachPage.mockImplementation(makeForEachPageMock([], []));

      await service.syncProducts();

      expect(productRepo.upsert).not.toHaveBeenCalled();
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
    });
  });
});
