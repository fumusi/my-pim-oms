import { Injectable } from '@nestjs/common';
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import type { Order } from './entities/order.entity';

type PrinterInstance = {
  createPdfKitDocument(
    docDefinition: TDocumentDefinitions,
    options?: Record<string, unknown>,
  ): NodeJS.EventEmitter & { end(): void };
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake/js/Printer') as {
  default: new (fonts: Record<string, unknown>) => PrinterInstance;
};

function formatMoney(amount: number): string {
  return `€${amount.toFixed(2)}`;
}

@Injectable()
export class OrderInvoiceService {
  private readonly printer: PrinterInstance;

  constructor() {
    this.printer = new PdfPrinter.default({
      Courier: {
        normal: 'Courier',
        bold: 'Courier-Bold',
        italics: 'Courier-Oblique',
        bolditalics: 'Courier-BoldOblique',
      },
    });
  }

  buildDocDefinition(order: Order): TDocumentDefinitions {
    const metaLeft: Content[] = [
      { text: `Order: ${order.orderNumber}`, bold: true },
      { text: `Date: ${order.createdAt.toLocaleDateString('en-GB')}` },
      { text: `Status: ${order.status}` },
      { text: `Source: ${order.orderSource}` },
    ];

    const metaRight: Content[] = [
      { text: `Delivery: ${order.deliveryOption}` },
      ...(order.trackingUrl ? [{ text: `Tracking: ${order.trackingUrl}` } as Content] : []),
      ...(order.freeShippingApplied ? [{ text: 'Free shipping applied', color: 'green' } as Content] : []),
    ];

    const customerLines: Content[] = [
      { text: 'Bill To', style: 'sectionHeader' },
      { text: order.customer.name },
      ...(order.customer.companyName ? [{ text: order.customer.companyName } as Content] : []),
      { text: order.customer.email },
    ];

    const addr = order.shippingAddress;
    const addressParts = [
      `${addr.street} ${addr.houseNumber}`,
      ', ',
      `${addr.postalCode} ${addr.city}`,
      addr.province ? `, ${addr.province}` : '',
      ', ',
      addr.country,
    ];

    const lineItemRows = order.lineItems.map((li) => [
      li.productName,
      li.sku ?? '-',
      String(li.quantity),
      formatMoney(li.unitPrice),
      `${li.discount}%`,
      formatMoney(li.lineTotalExclVat ?? 0),
    ]);

    const content: Content[] = [
      { text: 'INVOICE', style: 'header' },
      { text: 'MyPIM OMS', style: 'subheader' },
      { text: '[Logo placeholder]', style: 'small', color: '#aaaaaa' },
      {
        columns: [metaLeft, metaRight],
      },
      ...customerLines,
      { text: 'Ship To', style: 'sectionHeader' },
      { text: addressParts.join('') },
      { text: 'Line Items', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: [
            ['Product', 'SKU', 'Qty', 'Unit Price', 'Discount', 'Line Total'],
            ...lineItemRows,
          ],
        },
      },
      {
        columns: [
          { text: '' },
          {
            table: {
              widths: ['*', 'auto'],
              body: [
                ['Subtotal (excl. VAT)', formatMoney(order.totalExclVat ?? 0)],
                [`VAT (${order.vatPercentage ?? 0}%)`, formatMoney(order.vatAmount ?? 0)],
                [
                  'Shipping',
                  order.freeShippingApplied ? 'Free' : formatMoney(order.shippingCost),
                ],
                [
                  { text: 'Total (incl. VAT)', bold: true },
                  { text: formatMoney(order.totalInclVat ?? 0), bold: true },
                ],
              ],
            },
          },
        ],
      },
    ];

    return {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      defaultStyle: { font: 'Courier', fontSize: 10 },
      content,
      styles: {
        header: { fontSize: 22, bold: true, marginBottom: 4 },
        subheader: { fontSize: 14, marginBottom: 2 },
        sectionHeader: { fontSize: 12, bold: true, marginTop: 12, marginBottom: 4 },
        small: { fontSize: 8 },
      },
    };
  }

  generateInvoice(order: Order): Promise<Buffer> {
    const docDef = this.buildDocDefinition(order);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = this.printer.createPdfKitDocument(docDef);
      doc.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }
}
