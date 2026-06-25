import { Test } from '@nestjs/testing';
import { OrderInvoiceService } from './order-invoice.service';
import type { Order } from './entities/order.entity';
import type { LineItem } from './entities/line-item.entity';
import type { Customer } from '../customers/entities/customer.entity';
import type { Address } from '../customers/entities/address.entity';
import { OrderStatus } from '../common/enums/order-status.enum';
import { DeliveryOption } from '../common/enums/delivery-option.enum';

function makeOrder(overrides: Partial<Order> = {}): Order {
  const customer: Customer = {
    id: 1,
    customerNumber: 'CUST-0001',
    name: 'Jane Doe',
    companyName: 'Acme Corp',
    email: 'jane@acme.com',
    phoneNumber: null,
    country: 'Netherlands',
    vatNumber: null,
    status: 'active' as any,
    endDate: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: null,
    updatedBy: null,
    archivedAt: null,
    contacts: [],
    addresses: [],
    members: [],
  };

  const shippingAddress: Address = {
    id: 1,
    customerId: 1,
    customer,
    street: 'Keizersgracht',
    houseNumber: '123',
    postalCode: '1015 CJ',
    city: 'Amsterdam',
    province: 'Noord-Holland',
    country: 'Netherlands',
    isPrimary: true,
  };

  const lineItems: LineItem[] = [
    {
      id: 1,
      orderId: 1,
      order: {} as any,
      productId: 10,
      product: {} as any,
      productName: 'Widget A',
      sku: 'SKU-001',
      quantity: 2,
      unitPrice: 50,
      discount: 0,
      lineTotalExclVat: 100,
      isFulfillable: true,
    },
    {
      id: 2,
      orderId: 1,
      order: {} as any,
      productId: 11,
      product: {} as any,
      productName: 'Gadget B',
      sku: null,
      quantity: 1,
      unitPrice: 30,
      discount: 10,
      lineTotalExclVat: 27,
      isFulfillable: true,
    },
  ];

  return {
    id: 1,
    orderNumber: 'ORD-0001',
    customerId: 1,
    customer,
    shippingAddressId: 1,
    shippingAddress,
    status: OrderStatus.Open,
    description: null,
    orderSource: 'manual',
    deliveryOption: DeliveryOption.Dhl,
    trackingUrl: null,
    vatPercentage: 21,
    vatAmount: 26.67,
    totalExclVat: 127,
    totalInclVat: 153.67,
    shippingCost: 10,
    nominalShippingCost: 10,
    freeShippingApplied: false,
    archiveReason: null,
    archivedAt: null,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
    createdBy: 'admin@test.com',
    updatedBy: 'admin@test.com',
    lineItems,
    ...overrides,
  };
}

function flattenContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(flattenContent).join(' ');
  if (content && typeof content === 'object') {
    const obj = content as Record<string, unknown>;
    const parts: string[] = [];
    if (obj.text !== undefined) parts.push(flattenContent(obj.text));
    if (obj.columns) parts.push(flattenContent(obj.columns));
    if (obj.body) parts.push(flattenContent(obj.body));
    if (obj.table) parts.push(flattenContent(obj.table));
    if (obj.content) parts.push(flattenContent(obj.content));
    return parts.join(' ');
  }
  return '';
}

describe('OrderInvoiceService', () => {
  let svc: OrderInvoiceService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [OrderInvoiceService],
    }).compile();
    svc = mod.get(OrderInvoiceService);
  });

  it('includes orderNumber in content', () => {
    const doc = svc.buildDocDefinition(makeOrder());
    const text = flattenContent(doc.content);
    expect(text).toContain('ORD-0001');
  });

  it('includes customer name in content', () => {
    const doc = svc.buildDocDefinition(makeOrder());
    const text = flattenContent(doc.content);
    expect(text).toContain('Jane Doe');
  });

  it('line items table has header row + N data rows', () => {
    const order = makeOrder();
    const doc = svc.buildDocDefinition(order);
    const contentArr = doc.content as any[];
    const tableNode = contentArr.find(
      (c: any) => c && c.table && c.table.headerRows === 1,
    );
    expect(tableNode).toBeDefined();
    const body: unknown[][] = tableNode.table.body;
    expect(body).toHaveLength(1 + order.lineItems.length);
  });

  it('adds free shipping text when freeShippingApplied is true', () => {
    const doc = svc.buildDocDefinition(
      makeOrder({ freeShippingApplied: true }),
    );
    const text = flattenContent(doc.content);
    expect(text).toContain('Free shipping applied');
  });

  it('does not include free shipping text when freeShippingApplied is false', () => {
    const doc = svc.buildDocDefinition(
      makeOrder({ freeShippingApplied: false }),
    );
    const text = flattenContent(doc.content);
    expect(text).not.toContain('Free shipping applied');
  });

  it('includes trackingUrl when present', () => {
    const doc = svc.buildDocDefinition(
      makeOrder({ trackingUrl: 'https://track.example.com/abc123' }),
    );
    const text = flattenContent(doc.content);
    expect(text).toContain('https://track.example.com/abc123');
  });

  it('does not include tracking text when trackingUrl is null', () => {
    const doc = svc.buildDocDefinition(makeOrder({ trackingUrl: null }));
    const text = flattenContent(doc.content);
    expect(text).not.toContain('Tracking:');
  });
});
