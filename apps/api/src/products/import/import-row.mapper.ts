import { ProductStatus } from '../../common/enums/product-status.enum';
import { SuitableFor } from '../../common/enums/suitable-for.enum';
import { Finishing } from '../../common/enums/finishing.enum';
import type { LocalizedText } from '../../common/types/localized-text.interface';

export interface ImportRowData {
  exactId?: string;
  barcode?: string;
  categoryId?: number;
  name?: LocalizedText;
  description?: LocalizedText;
  status?: ProductStatus;
  stock?: number;
  backorder?: boolean;
  lowStockThreshold?: number;
  endDate?: string;
  weight?: number;
  height?: number;
  width?: number;
  depth?: number;
  length?: number;
  thickness?: number;
  capacity?: number;
  color?: string;
  material?: string;
  application?: string;
  countryOfOrigin?: string;
  suitableFor?: SuitableFor;
  finishing?: Finishing;
  co2EmissionProduction?: string;
  co2EmissionTransport?: string;
  douProduct?: boolean;
  biodegradable?: boolean;
  handmade?: boolean;
  scratchProne?: boolean;
  typeOfClosure?: string;
  gemstoneType?: string;
}

export type ImportRowResult = { ok: true; data: ImportRowData } | { ok: false; reason: string };

export const TEMPLATE_HEADERS = [
  'name_nl', 'name_en', 'name_de',
  'description_nl', 'description_en', 'description_de',
  'barcode', 'exactId', 'status', 'categoryId',
  'stock', 'backorder', 'lowStockThreshold', 'endDate',
  'weight', 'height', 'width', 'depth', 'length', 'thickness', 'capacity',
  'color', 'material', 'application', 'countryOfOrigin',
  'suitableFor', 'finishing',
  'co2EmissionProduction', 'co2EmissionTransport',
  'douProduct', 'biodegradable', 'handmade', 'scratchProne',
  'typeOfClosure', 'gemstoneType',
] as const;

function str(v: unknown): string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  return String(v).trim() || undefined;
}

function num(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  return Number(v);
}

function parseBool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (v === null || v === undefined || v === '') return undefined;
  const s = String(v).toLowerCase().trim();
  if (s === 'true' || s === '1' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'no') return false;
  return undefined;
}

export function mapImportRow(row: Record<string, unknown>): ImportRowResult {
  const errors: string[] = [];
  const data: ImportRowData = {};

  // Localized name
  const nl = str(row['name_nl']);
  const en = str(row['name_en']);
  const de = str(row['name_de']);
  if (nl || en || de) {
    data.name = { ...(nl ? { nl } : {}), ...(en ? { en } : {}), ...(de ? { de } : {}) };
  }

  // Localized description
  const dnl = str(row['description_nl']);
  const den = str(row['description_en']);
  const dde = str(row['description_de']);
  if (dnl || den || dde) {
    data.description = { ...(dnl ? { nl: dnl } : {}), ...(den ? { en: den } : {}), ...(dde ? { de: dde } : {}) };
  }

  // String identity fields
  const exactId = str(row['exactId']);
  if (exactId !== undefined) data.exactId = exactId;
  const barcode = str(row['barcode']);
  if (barcode !== undefined) data.barcode = barcode;

  // String attribute fields
  const stringFields = [
    'color', 'material', 'application', 'countryOfOrigin',
    'co2EmissionProduction', 'co2EmissionTransport',
    'typeOfClosure', 'gemstoneType',
  ] as const;
  for (const f of stringFields) {
    const v = str(row[f]);
    if (v !== undefined) (data as Record<string, unknown>)[f] = v;
  }

  // Status enum
  const statusRaw = str(row['status']);
  if (statusRaw !== undefined) {
    if (!(Object.values(ProductStatus) as string[]).includes(statusRaw)) {
      errors.push(`status "${statusRaw}" must be one of: ${Object.values(ProductStatus).join(', ')}`);
    } else {
      data.status = statusRaw as ProductStatus;
    }
  }

  // SuitableFor enum
  const sfRaw = str(row['suitableFor']);
  if (sfRaw !== undefined) {
    if (!(Object.values(SuitableFor) as string[]).includes(sfRaw)) {
      errors.push(`suitableFor "${sfRaw}" must be one of: ${Object.values(SuitableFor).join(', ')}`);
    } else {
      data.suitableFor = sfRaw as SuitableFor;
    }
  }

  // Finishing enum
  const finRaw = str(row['finishing']);
  if (finRaw !== undefined) {
    if (!(Object.values(Finishing) as string[]).includes(finRaw)) {
      errors.push(`finishing "${finRaw}" must be one of: ${Object.values(Finishing).join(', ')}`);
    } else {
      data.finishing = finRaw as Finishing;
    }
  }

  // endDate — must be YYYY-MM-DD
  const edRaw = str(row['endDate']);
  if (edRaw !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(edRaw)) {
      errors.push(`endDate "${edRaw}" must be in YYYY-MM-DD format`);
    } else {
      data.endDate = edRaw;
    }
  }

  // Decimal numeric fields
  const decimalFields = [
    'stock', 'weight', 'height', 'width', 'depth', 'length', 'thickness', 'capacity',
  ] as const;
  for (const f of decimalFields) {
    const v = row[f];
    if (v !== null && v !== undefined && v !== '') {
      const n = num(v);
      if (n === undefined || isNaN(n)) {
        errors.push(`${f} "${v}" is not a valid number`);
      } else {
        (data as Record<string, unknown>)[f] = n;
      }
    }
  }

  // Integer fields
  const intFields = ['categoryId', 'lowStockThreshold'] as const;
  for (const f of intFields) {
    const v = row[f];
    if (v !== null && v !== undefined && v !== '') {
      const n = num(v);
      if (n === undefined || isNaN(n) || !Number.isInteger(n)) {
        errors.push(`${f} "${v}" must be a whole number`);
      } else {
        (data as Record<string, unknown>)[f] = n;
      }
    }
  }

  // Boolean fields
  const boolFields = ['backorder', 'douProduct', 'biodegradable', 'handmade', 'scratchProne'] as const;
  for (const f of boolFields) {
    const v = row[f];
    if (v !== null && v !== undefined && v !== '') {
      const b = parseBool(v);
      if (b === undefined) {
        errors.push(`${f} "${v}" must be one of: true, false, 1, 0, yes, no`);
      } else {
        (data as Record<string, unknown>)[f] = b;
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, reason: errors.join('; ') };
  }

  return { ok: true, data };
}
