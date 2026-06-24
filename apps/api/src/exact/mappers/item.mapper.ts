import { ExactItem } from '../entities/exact-item.entity';
import { ExactItemGroup } from '../entities/exact-item-group.entity';
import { Product } from '../../products/entities/product.entity';
import { ProductStatus } from '../../common/enums/product-status.enum';
import { ExactItemResponse, ExactItemGroupResponse } from '../types';
import { parseDate } from '../utils/parse-date';

const numToBool = (n: number | null): boolean | null => (n == null ? null : n !== 0);

export function mapItem(i: ExactItemResponse): Partial<ExactItem> {
  return {
    id: i.ID,
    code: i.Code,
    description: i.Description,
    division: i.Division,
    standardSalesPrice: i.StandardSalesPrice,
    costPriceStandard: i.CostPriceStandard,
    costPriceCurrency: i.CostPriceCurrency,
    isBatchNumberItem: numToBool(i.IsBatchNumberItem),
    isBatchItem: numToBool(i.IsBatchItem),
    isFractionAllowedItem: i.IsFractionAllowedItem,
    isPackageItem: i.IsPackageItem,
    isPurchaseItem: i.IsPurchaseItem,
    isSalesItem: i.IsSalesItem,
    isSerialItem: i.IsSerialItem,
    isStockItem: i.IsStockItem,
    isWebshopItem: numToBool(i.IsWebshopItem),
    isSerialNumberItem: numToBool(i.IsSerialNumberItem),
    isTaxableItem: i.IsTaxableItem,
    barcode: i.Barcode,
    extraDescription: i.ExtraDescription,
    notes: i.Notes,
    searchCode: i.SearchCode,
    averageCost: i.AverageCost,
    grossWeight: i.GrossWeight,
    netWeight: i.NetWeight,
    netWeightUnit: i.NetWeightUnit,
    itemGroup: i.ItemGroup ? ({ id: i.ItemGroup } as ExactItemGroup) : null,
    itemGroupCode: i.ItemGroupCode,
    itemGroupDescription: i.ItemGroupDescription,
    salesVatCode: i.SalesVatCode,
    salesVatCodeDescription: i.SalesVatCodeDescription,
    startDate: parseDate(i.StartDate),
    endDate: parseDate(i.EndDate),
    stock: i.Stock,
    unit: i.Unit,
    unitDescription: i.UnitDescription,
    unitType: i.UnitType,
    pictureUrl: i.PictureUrl,
    pictureThumbnailUrl: i.PictureThumbnailUrl,
    creator: i.Creator,
    creatorFullName: i.CreatorFullName,
    modifier: i.Modifier,
    modifierFullName: i.ModifierFullName,
    created: parseDate(i.Created),
    modified: parseDate(i.Modified),
  };
}

export function mapProduct(
  i: ExactItemResponse,
): Pick<Product, 'exactId' | 'barcode' | 'currency' | 'basePrice' | 'purchasePrice' | 'salesVatCode' | 'name' | 'weight' | 'stock' | 'status'> {
  return {
    exactId: i.ID,
    barcode: i.Barcode,
    currency: i.CostPriceCurrency,
    basePrice: i.StandardSalesPrice,
    purchasePrice: i.CostPriceStandard,
    salesVatCode: i.SalesVatCode,
    name: i.Description ? { en: i.Description } : null,
    weight: i.NetWeight,
    stock: i.Stock,
    status: i.IsSalesItem === false ? ProductStatus.Inactive : ProductStatus.Active,
  };
}

export function mapItemGroup(g: ExactItemGroupResponse): Partial<ExactItemGroup> {
  return {
    id: g.ID,
    code: g.Code,
    description: g.Description,
    division: g.Division,
    glCosts: g.GLCosts,
    glCostsCode: g.GLCostsCode,
    glCostsDescription: g.GLCostsDescription,
    glRevenue: g.GLRevenue,
    glRevenueCode: g.GLRevenueCode,
    glRevenueDescription: g.GLRevenueDescription,
    glStock: g.GLStock,
    glStockCode: g.GLStockCode,
    glStockDescription: g.GLStockDescription,
    creator: g.Creator,
    creatorFullName: g.CreatorFullName,
    modifier: g.Modifier,
    isDefault: numToBool(g.IsDefault),
    created: parseDate(g.Created),
    modified: parseDate(g.Modified),
  };
}
