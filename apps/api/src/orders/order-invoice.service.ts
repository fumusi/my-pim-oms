import { Injectable } from '@nestjs/common';
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import type { Order } from './entities/order.entity';

type PdfDoc = NodeJS.EventEmitter & { end(): void };

type PrinterInstance = {
  createPdfKitDocument(
    docDefinition: TDocumentDefinitions,
    options?: Record<string, unknown>,
  ): Promise<PdfDoc>;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake/js/Printer') as {
  default: new (
    fonts: Record<string, unknown>,
    virtualfs: undefined,
    urlResolver: { resolve: (url: string, headers: Record<string, string>) => void; resolved: () => Promise<void> },
  ) => PrinterInstance;
};

function formatMoney(amount: number): string {
  return `€${amount.toFixed(2)}`;
}

@Injectable()
export class OrderInvoiceService {
  private readonly printer: PrinterInstance;

  constructor() {
    const noopUrlResolver = {
      resolve: (_url: string, _headers: Record<string, string>) => {},
      resolved: () => Promise.resolve(),
    };
    this.printer = new PdfPrinter.default(
      {
        Courier: {
          normal: 'Courier',
          bold: 'Courier-Bold',
          italics: 'Courier-Oblique',
          bolditalics: 'Courier-BoldOblique',
        },
      },
      undefined,
      noopUrlResolver,
    );
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

    const customerLines: Content[] = order.customer
      ? [
          { text: 'Bill To', style: 'sectionHeader' },
          { text: order.customer.name ?? 'N/A' },
          ...(order.customer.companyName ? [{ text: order.customer.companyName } as Content] : []),
          { text: order.customer.email ?? 'N/A' },
        ]
      : [];

    const addr = order.shippingAddress ?? order.shippingSnapshot;
    const addressSection: Content[] = addr
      ? [
          { text: 'Ship To', style: 'sectionHeader' },
          {
            text: [
              `${addr.street} ${addr.houseNumber}`,
              ', ',
              `${addr.postalCode} ${addr.city}`,
              addr.province ? `, ${addr.province}` : '',
              ', ',
              addr.country,
            ].join(''),
          },
        ]
      : [];

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
      {
        columns: [metaLeft, metaRight],
      },
      ...customerLines,
      ...addressSection,
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

  async generateInvoice(order: Order): Promise<Buffer> {
    const docDef = this.buildDocDefinition(order);
    const doc = await this.printer.createPdfKitDocument(docDef);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }
}
