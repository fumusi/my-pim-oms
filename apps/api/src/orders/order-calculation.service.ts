import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LineItemInput {
  unitPrice: number;
  quantity: number;
  discount: number;
}

export interface OrderTotals {
  totalExclVat: number;
  vatAmount: number;
  totalInclVat: number;
  shippingCost: number;
  freeShippingApplied: boolean;
}

@Injectable()
export class OrderCalculationService {
  private readonly threshold: number;

  constructor(private readonly config: ConfigService) {
    this.threshold = parseFloat(
      config.get<string>('FREE_SHIPPING_THRESHOLD') ?? '150',
    );
  }

  calcLineTotal(item: LineItemInput): number {
    return round4(item.unitPrice * item.quantity * (1 - item.discount / 100));
  }

  calcTotals(
    lineItems: LineItemInput[],
    vatPercentage: number | null,
    currentShippingCost: number,
  ): OrderTotals {
    const totalExclVat = round4(
      lineItems.reduce((sum, li) => sum + this.calcLineTotal(li), 0),
    );
    const freeShippingApplied = totalExclVat >= this.threshold;
    const shippingCost = freeShippingApplied ? 0 : currentShippingCost;
    const vatAmount =
      vatPercentage != null ? round4((totalExclVat * vatPercentage) / 100) : 0;
    const totalInclVat = round4(totalExclVat + vatAmount + shippingCost);
    return {
      totalExclVat,
      vatAmount,
      totalInclVat,
      shippingCost,
      freeShippingApplied,
    };
  }

  isFulfillable(stock: number | null, quantity: number): boolean {
    return stock != null && stock >= quantity;
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
