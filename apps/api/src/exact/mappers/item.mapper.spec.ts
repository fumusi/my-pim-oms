import { mapItem, mapItemGroup, mapProduct } from './item.mapper';
import { parseDate } from '../utils/parse-date';
import type { ExactItemResponse, ExactItemGroupResponse } from '../types';

const makeItemResponse = (overrides: Partial<ExactItemResponse> = {}): ExactItemResponse => ({
  ID: 'item-uuid-1',
  Code: 'PROD-001',
  Description: 'Test Product',
  Division: 123,
  StandardSalesPrice: 19.99,
  CostPriceStandard: 10.0,
  CostPriceCurrency: 'EUR',
  IsBatchNumberItem: 0,
  IsBatchItem: 0,
  IsFractionAllowedItem: false,
  IsPackageItem: false,
  IsPurchaseItem: true,
  IsSalesItem: true,
  IsSerialItem: false,
  IsStockItem: true,
  IsWebshopItem: 0,
  IsSerialNumberItem: 0,
  IsTaxableItem: true,
  Barcode: '1234567890123',
  ExtraDescription: null,
  Notes: 'Some notes',
  SearchCode: 'SEARCH',
  AverageCost: 9.5,
  GrossWeight: 1.2,
  NetWeight: 1.0,
  NetWeightUnit: 'kg',
  ItemGroup: 'group-uuid-1',
  ItemGroupCode: 'GRP',
  ItemGroupDescription: 'Group A',
  SalesVatCode: 'V1',
  SalesVatCodeDescription: 'VAT 21%',
  StartDate: '/Date(1672531200000)/',
  EndDate: null,
  Stock: 50.0,
  Unit: 'pc',
  UnitDescription: 'Piece',
  UnitType: 'C',
  PictureUrl: null,
  PictureThumbnailUrl: null,
  Creator: 'creator-uuid',
  CreatorFullName: 'Jane Doe',
  Modifier: null,
  ModifierFullName: null,
  Created: '2023-01-01T00:00:00',
  Modified: '2023-06-01T00:00:00',
  ...overrides,
});

const makeGroupResponse = (overrides: Partial<ExactItemGroupResponse> = {}): ExactItemGroupResponse => ({
  ID: 'group-uuid-1',
  Code: 'GRP',
  Description: 'Group A',
  Division: 123,
  GLCosts: 'gl-costs-uuid',
  GLCostsCode: 'C1',
  GLCostsDescription: 'Cost GL',
  GLRevenue: 'gl-revenue-uuid',
  GLRevenueCode: 'R1',
  GLRevenueDescription: 'Revenue GL',
  GLStock: 'gl-stock-uuid',
  GLStockCode: 'S1',
  GLStockDescription: 'Stock GL',
  Creator: 'creator-uuid',
  CreatorFullName: 'Jane Doe',
  Modifier: null,
  IsDefault: 1,
  Created: '/Date(1672531200000)/',
  Modified: null,
  ...overrides,
});

describe('parseDate', () => {
  it('returns null for null input', () => {
    expect(parseDate(null)).toBeNull();
  });

  it('parses OData /Date(ms)/ format', () => {
    const result = parseDate('/Date(1672531200000)/');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getTime()).toBe(1672531200000);
  });

  it('parses ISO string', () => {
    const result = parseDate('2023-01-01T00:00:00');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2023);
  });

  it('returns null for invalid string', () => {
    expect(parseDate('not-a-date')).toBeNull();
  });
});

describe('mapItem', () => {
  it('maps all core fields from ExactItemResponse', () => {
    const result = mapItem(makeItemResponse());

    expect(result.id).toBe('item-uuid-1');
    expect(result.code).toBe('PROD-001');
    expect(result.description).toBe('Test Product');
    expect(result.division).toBe(123);
    expect(result.standardSalesPrice).toBe(19.99);
    expect(result.isSalesItem).toBe(true);
    expect(result.isStockItem).toBe(true);
    expect(result.barcode).toBe('1234567890123');
    expect(result.stock).toBe(50.0);
    expect(result.unit).toBe('pc');
  });

  it('maps itemGroup FK as partial object with id', () => {
    const result = mapItem(makeItemResponse({ ItemGroup: 'group-uuid-1' }));
    expect(result.itemGroup).toEqual({ id: 'group-uuid-1' });
  });

  it('sets itemGroup to null when ItemGroup is null', () => {
    const result = mapItem(makeItemResponse({ ItemGroup: null }));
    expect(result.itemGroup).toBeNull();
  });

  it('parses OData StartDate', () => {
    const result = mapItem(makeItemResponse({ StartDate: '/Date(1672531200000)/' }));
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.startDate!.getTime()).toBe(1672531200000);
  });

  it('sets startDate/endDate to null when null input', () => {
    const result = mapItem(makeItemResponse({ StartDate: null, EndDate: null }));
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
  });

  it('maps null fields to null', () => {
    const result = mapItem(makeItemResponse({ Notes: null, Barcode: null, PictureUrl: null }));
    expect(result.notes).toBeNull();
    expect(result.barcode).toBeNull();
    expect(result.pictureUrl).toBeNull();
  });

  it('normalises smallint flags: 0 → false, 1 → true, null → null', () => {
    const falsy = mapItem(makeItemResponse({ IsBatchItem: 0, IsBatchNumberItem: 0, IsWebshopItem: 0, IsSerialNumberItem: 0 }));
    expect(falsy.isBatchItem).toBe(false);
    expect(falsy.isBatchNumberItem).toBe(false);
    expect(falsy.isWebshopItem).toBe(false);
    expect(falsy.isSerialNumberItem).toBe(false);

    const truthy = mapItem(makeItemResponse({ IsBatchItem: 1, IsBatchNumberItem: 1, IsWebshopItem: 1, IsSerialNumberItem: 1 }));
    expect(truthy.isBatchItem).toBe(true);
    expect(truthy.isBatchNumberItem).toBe(true);
    expect(truthy.isWebshopItem).toBe(true);
    expect(truthy.isSerialNumberItem).toBe(true);

    const nullish = mapItem(makeItemResponse({ IsBatchItem: null, IsBatchNumberItem: null, IsWebshopItem: null, IsSerialNumberItem: null }));
    expect(nullish.isBatchItem).toBeNull();
    expect(nullish.isBatchNumberItem).toBeNull();
    expect(nullish.isWebshopItem).toBeNull();
    expect(nullish.isSerialNumberItem).toBeNull();
  });
});

describe('mapProduct', () => {
  it('maps exactId, barcode, currency, basePrice, purchasePrice, salesVatCode from Exact response', () => {
    const result = mapProduct(makeItemResponse());

    expect(result.exactId).toBe('item-uuid-1');
    expect(result.barcode).toBe('1234567890123');
    expect(result.currency).toBe('EUR');
    expect(result.basePrice).toBe(19.99);
    expect(result.purchasePrice).toBe(10.0);
    expect(result.salesVatCode).toBe('V1');
  });

  it('seeds name.en from Description for initial insert', () => {
    const result = mapProduct(makeItemResponse({ Description: 'Ceramic Vase' }));
    expect(result.name).toEqual({ en: 'Ceramic Vase' });
  });

  it('sets name to null when Description is null', () => {
    const result = mapProduct(makeItemResponse({ Description: null }));
    expect(result.name).toBeNull();
  });

  it('seeds weight from NetWeight', () => {
    const result = mapProduct(makeItemResponse({ NetWeight: 1.0 }));
    expect(result.weight).toBe(1.0);
  });

  it('sets weight to null when NetWeight is null', () => {
    const result = mapProduct(makeItemResponse({ NetWeight: null }));
    expect(result.weight).toBeNull();
  });

  it('maps null Exact fields to null', () => {
    const result = mapProduct(makeItemResponse({
      Barcode: null,
      CostPriceCurrency: null,
      StandardSalesPrice: null,
      CostPriceStandard: null,
      SalesVatCode: null,
    }));

    expect(result.barcode).toBeNull();
    expect(result.currency).toBeNull();
    expect(result.basePrice).toBeNull();
    expect(result.purchasePrice).toBeNull();
    expect(result.salesVatCode).toBeNull();
  });

  it('does not include pure internal/PIM-only fields', () => {
    const result = mapProduct(makeItemResponse());

    expect(result).not.toHaveProperty('status');
    expect(result).not.toHaveProperty('backorder');
    expect(result).not.toHaveProperty('description');
    expect(result).not.toHaveProperty('endDate');
  });
});

describe('mapItemGroup', () => {
  it('maps all core fields from ExactItemGroupResponse', () => {
    const result = mapItemGroup(makeGroupResponse());

    expect(result.id).toBe('group-uuid-1');
    expect(result.code).toBe('GRP');
    expect(result.description).toBe('Group A');
    expect(result.division).toBe(123);
    expect(result.isDefault).toBe(true);
    expect(result.glCosts).toBe('gl-costs-uuid');
    expect(result.glCostsCode).toBe('C1');
    expect(result.glRevenue).toBe('gl-revenue-uuid');
    expect(result.glStock).toBe('gl-stock-uuid');
    expect(result.creatorFullName).toBe('Jane Doe');
  });

  it('parses OData Created date', () => {
    const result = mapItemGroup(makeGroupResponse({ Created: '/Date(1672531200000)/' }));
    expect(result.created).toBeInstanceOf(Date);
    expect(result.created!.getTime()).toBe(1672531200000);
  });

  it('sets modified to null when null input', () => {
    const result = mapItemGroup(makeGroupResponse({ Modified: null }));
    expect(result.modified).toBeNull();
  });
});
