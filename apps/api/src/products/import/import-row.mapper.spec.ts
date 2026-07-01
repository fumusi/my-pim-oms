import { mapImportRow } from './import-row.mapper';
import { ProductStatus } from '../../common/enums/product-status.enum';
import { SuitableFor } from '../../common/enums/suitable-for.enum';
import { Finishing } from '../../common/enums/finishing.enum';

const baseRow = () => ({
  name_en: 'Ceramic Vase',
  barcode: 'BAR-001',
});

describe('mapImportRow', () => {
  describe('localized name', () => {
    it('maps name_nl/en/de into a localized object', () => {
      const result = mapImportRow({
        name_nl: 'Vaas',
        name_en: 'Vase',
        name_de: 'Vase DE',
      });
      expect(result).toMatchObject({ ok: true });
      if (result.ok) {
        expect(result.data.name).toEqual({
          nl: 'Vaas',
          en: 'Vase',
          de: 'Vase DE',
        });
      }
    });

    it('omits language keys that are empty', () => {
      const result = mapImportRow({
        name_en: 'Vase',
        name_nl: '',
        name_de: null,
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.name).toEqual({ en: 'Vase' });
    });

    it('leaves name undefined when all language columns are absent', () => {
      const result = mapImportRow({});
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.name).toBeUndefined();
    });
  });

  describe('localized description', () => {
    it('maps description_nl/en/de into a localized object', () => {
      const result = mapImportRow({ description_en: 'A beautiful vase' });
      expect(result.ok).toBe(true);
      if (result.ok)
        expect(result.data.description).toEqual({ en: 'A beautiful vase' });
    });

    it('leaves description undefined when all columns absent', () => {
      const result = mapImportRow(baseRow());
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.description).toBeUndefined();
    });
  });

  describe('identity fields', () => {
    it('maps barcode and exactId as strings', () => {
      const result = mapImportRow({ barcode: 'BAR-999', exactId: 'uuid-abc' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.barcode).toBe('BAR-999');
        expect(result.data.exactId).toBe('uuid-abc');
      }
    });

    it('leaves barcode and exactId undefined when absent', () => {
      const result = mapImportRow({});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.barcode).toBeUndefined();
        expect(result.data.exactId).toBeUndefined();
      }
    });
  });

  describe('status enum', () => {
    it('accepts valid status values', () => {
      for (const status of Object.values(ProductStatus)) {
        const result = mapImportRow({ ...baseRow(), status });
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.data.status).toBe(status);
      }
    });

    it('returns error for invalid status', () => {
      const result = mapImportRow({ ...baseRow(), status: 'deleted' });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('status');
    });

    it('leaves status undefined when absent', () => {
      const result = mapImportRow(baseRow());
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.status).toBeUndefined();
    });
  });

  describe('suitableFor enum', () => {
    it('accepts valid suitableFor values', () => {
      const result = mapImportRow({
        ...baseRow(),
        suitableFor: SuitableFor.Indoor,
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.suitableFor).toBe(SuitableFor.Indoor);
    });

    it('returns error for invalid suitableFor', () => {
      const result = mapImportRow({ ...baseRow(), suitableFor: 'garden' });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('suitableFor');
    });
  });

  describe('finishing enum', () => {
    it('accepts valid finishing values', () => {
      const result = mapImportRow({ ...baseRow(), finishing: Finishing.Matte });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.finishing).toBe(Finishing.Matte);
    });

    it('returns error for invalid finishing', () => {
      const result = mapImportRow({ ...baseRow(), finishing: 'shiny' });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('finishing');
    });
  });

  describe('endDate', () => {
    it('accepts YYYY-MM-DD format', () => {
      const result = mapImportRow({ ...baseRow(), endDate: '2026-12-31' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.endDate).toBe('2026-12-31');
    });

    it('returns error for invalid date format', () => {
      const result = mapImportRow({ ...baseRow(), endDate: '31/12/2026' });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('endDate');
    });

    it('returns error for partial date string', () => {
      const result = mapImportRow({ ...baseRow(), endDate: '2026-12' });
      expect(result.ok).toBe(false);
    });
  });

  describe('numeric fields', () => {
    it('parses stock as a number', () => {
      const result = mapImportRow({ ...baseRow(), stock: '42.5' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.stock).toBe(42.5);
    });

    it('parses integer stock (numeric type from xlsx)', () => {
      const result = mapImportRow({ ...baseRow(), stock: 10 });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.stock).toBe(10);
    });

    it('returns error for non-numeric stock', () => {
      const result = mapImportRow({ ...baseRow(), stock: 'many' });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('stock');
    });

    it('parses all measurement fields', () => {
      const row = {
        ...baseRow(),
        weight: 1.2,
        height: 10,
        width: 5,
        depth: 3,
        length: 8,
        thickness: 0.5,
        capacity: 2,
      };
      const result = mapImportRow(row);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.weight).toBe(1.2);
        expect(result.data.height).toBe(10);
        expect(result.data.thickness).toBe(0.5);
      }
    });

    it('leaves numeric fields undefined when absent or empty', () => {
      const result = mapImportRow({ ...baseRow(), weight: null, height: '' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.weight).toBeUndefined();
        expect(result.data.height).toBeUndefined();
      }
    });
  });

  describe('integer fields', () => {
    it('parses categoryId as integer', () => {
      const result = mapImportRow({ ...baseRow(), categoryId: '5' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.categoryId).toBe(5);
    });

    it('returns error for non-integer categoryId', () => {
      const result = mapImportRow({ ...baseRow(), categoryId: '5.5' });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('categoryId');
    });

    it('parses lowStockThreshold as integer', () => {
      const result = mapImportRow({ ...baseRow(), lowStockThreshold: 10 });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.lowStockThreshold).toBe(10);
    });
  });

  describe('boolean fields', () => {
    it('accepts string "true" and "false"', () => {
      const result = mapImportRow({
        ...baseRow(),
        backorder: 'true',
        handmade: 'false',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.backorder).toBe(true);
        expect(result.data.handmade).toBe(false);
      }
    });

    it('accepts native boolean values', () => {
      const result = mapImportRow({
        ...baseRow(),
        biodegradable: true,
        scratchProne: false,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.biodegradable).toBe(true);
        expect(result.data.scratchProne).toBe(false);
      }
    });

    it('accepts "1"/"0" as truthy/falsy', () => {
      const result = mapImportRow({
        ...baseRow(),
        douProduct: '1',
        backorder: '0',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.douProduct).toBe(true);
        expect(result.data.backorder).toBe(false);
      }
    });

    it('returns error for invalid boolean value', () => {
      const result = mapImportRow({ ...baseRow(), backorder: 'yes-please' });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('backorder');
    });

    it('leaves boolean fields undefined when absent', () => {
      const result = mapImportRow(baseRow());
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.backorder).toBeUndefined();
        expect(result.data.handmade).toBeUndefined();
      }
    });
  });

  describe('multiple errors', () => {
    it('collects all validation errors and returns them together', () => {
      const result = mapImportRow({
        ...baseRow(),
        status: 'deleted',
        endDate: 'not-a-date',
        stock: 'lots',
        categoryId: '1.5',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('status');
        expect(result.reason).toContain('endDate');
        expect(result.reason).toContain('stock');
        expect(result.reason).toContain('categoryId');
      }
    });
  });

  describe('valid full row', () => {
    it('maps a complete valid row to all expected fields', () => {
      const row = {
        name_nl: 'Vaas',
        name_en: 'Vase',
        barcode: 'EAN-123',
        exactId: 'uuid-1',
        status: 'active',
        categoryId: 3,
        stock: 25,
        backorder: false,
        lowStockThreshold: 5,
        endDate: '2027-01-01',
        weight: 0.8,
        color: 'blue',
        suitableFor: 'indoor',
        finishing: 'matte',
        typeOfClosure: 'snap',
        gemstoneType: 'diamond',
        handmade: true,
      };
      const result = mapImportRow(row);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const d = result.data;
        expect(d.name).toEqual({ nl: 'Vaas', en: 'Vase' });
        expect(d.barcode).toBe('EAN-123');
        expect(d.exactId).toBe('uuid-1');
        expect(d.status).toBe(ProductStatus.Active);
        expect(d.categoryId).toBe(3);
        expect(d.stock).toBe(25);
        expect(d.backorder).toBe(false);
        expect(d.lowStockThreshold).toBe(5);
        expect(d.endDate).toBe('2027-01-01');
        expect(d.weight).toBe(0.8);
        expect(d.color).toBe('blue');
        expect(d.suitableFor).toBe(SuitableFor.Indoor);
        expect(d.finishing).toBe(Finishing.Matte);
        expect(d.typeOfClosure).toBe('snap');
        expect(d.handmade).toBe(true);
      }
    });
  });
});
