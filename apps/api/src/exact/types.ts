export type ConnectionStatus = 'connected' | 'unauthorized' | 'disconnected';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix ms
}

export interface ODataResponse<T> {
  d: { results: T[]; __next?: string };
}

export interface ExactItemGroupResponse {
  ID: string;
  Code: string | null;
  Description: string | null;
  Division: number | null;
  GLCosts: string | null;
  GLCostsCode: string | null;
  GLCostsDescription: string | null;
  GLRevenue: string | null;
  GLRevenueCode: string | null;
  GLRevenueDescription: string | null;
  GLStock: string | null;
  GLStockCode: string | null;
  GLStockDescription: string | null;
  Creator: string | null;
  CreatorFullName: string | null;
  Modifier: string | null;
  IsDefault: number | null;
  Created: string | null;
  Modified: string | null;
}

export interface ExactItemResponse {
  ID: string;
  Code: string | null;
  Description: string | null;
  Division: number | null;
  StandardSalesPrice: number | null;
  CostPriceStandard: number | null;
  CostPriceCurrency: string | null;
  IsBatchNumberItem: number | null;
  IsBatchItem: number | null;
  IsFractionAllowedItem: boolean | null;
  IsPackageItem: boolean | null;
  IsPurchaseItem: boolean | null;
  IsSalesItem: boolean | null;
  IsSerialItem: boolean | null;
  IsStockItem: boolean | null;
  IsWebshopItem: number | null;
  IsSerialNumberItem: number | null;
  IsTaxableItem: boolean | null;
  Barcode: string | null;
  ExtraDescription: string | null;
  Notes: string | null;
  SearchCode: string | null;
  AverageCost: number | null;
  GrossWeight: number | null;
  NetWeight: number | null;
  NetWeightUnit: string | null;
  ItemGroup: string | null;
  ItemGroupCode: string | null;
  ItemGroupDescription: string | null;
  SalesVatCode: string | null;
  SalesVatCodeDescription: string | null;
  StartDate: string | null;
  EndDate: string | null;
  Stock: number | null;
  Unit: string | null;
  UnitDescription: string | null;
  UnitType: string | null;
  PictureUrl: string | null;
  PictureThumbnailUrl: string | null;
  Creator: string | null;
  CreatorFullName: string | null;
  Modifier: string | null;
  ModifierFullName: string | null;
  Created: string | null;
  Modified: string | null;
}

export interface SyncSummary {
  synced: number;
  created: number;
  updated: number;
}
