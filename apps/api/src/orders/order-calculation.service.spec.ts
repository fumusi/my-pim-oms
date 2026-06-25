import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrderCalculationService } from './order-calculation.service';

describe('OrderCalculationService', () => {
  let svc: OrderCalculationService;

  const makeModule = async (threshold = '150') => {
    const mod = await Test.createTestingModule({
      providers: [
        OrderCalculationService,
        { provide: ConfigService, useValue: { get: () => threshold } },
      ],
    }).compile();
    return mod.get(OrderCalculationService);
  };

  beforeEach(async () => {
    svc = await makeModule();
  });

  describe('calcLineTotal', () => {
    it('no discount', () =>
      expect(
        svc.calcLineTotal({ unitPrice: 10, quantity: 3, discount: 0 }),
      ).toBe(30));
    it('10% discount', () =>
      expect(
        svc.calcLineTotal({ unitPrice: 10, quantity: 3, discount: 10 }),
      ).toBe(27));
    it('rounds to 4dp', () =>
      expect(
        svc.calcLineTotal({ unitPrice: 10.1234, quantity: 1, discount: 0 }),
      ).toBe(10.1234));
  });

  describe('calcTotals', () => {
    const items = [
      { unitPrice: 100, quantity: 1, discount: 0 },
      { unitPrice: 50, quantity: 2, discount: 10 },
    ];

    it('sums line totals', () => {
      const r = svc.calcTotals(items, null, 10);
      expect(r.totalExclVat).toBe(190);
    });

    it('applies VAT', () => {
      const r = svc.calcTotals(items, 21, 10);
      expect(r.vatAmount).toBe(39.9);
      expect(r.totalInclVat).toBe(229.9);
    });

    it('free shipping when totalExclVat >= threshold', () => {
      const r = svc.calcTotals(items, null, 20);
      expect(r.freeShippingApplied).toBe(true);
      expect(r.shippingCost).toBe(0);
    });

    it('no free shipping below threshold', async () => {
      svc = await makeModule('500');
      const r = svc.calcTotals(items, null, 20);
      expect(r.freeShippingApplied).toBe(false);
      expect(r.shippingCost).toBe(20);
    });

    it('no VAT when vatPercentage is null', () => {
      const r = svc.calcTotals(items, null, 0);
      expect(r.vatAmount).toBe(0);
    });
  });

  describe('isFulfillable', () => {
    it('true when stock >= quantity', () =>
      expect(svc.isFulfillable(5, 3)).toBe(true));
    it('true when stock === quantity', () =>
      expect(svc.isFulfillable(3, 3)).toBe(true));
    it('false when stock < quantity', () =>
      expect(svc.isFulfillable(2, 3)).toBe(false));
    it('false when stock is null', () =>
      expect(svc.isFulfillable(null, 1)).toBe(false));
  });
});
