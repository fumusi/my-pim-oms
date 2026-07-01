import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShippingSnapshotToOrders1782490000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_snapshot jsonb`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE orders DROP COLUMN IF EXISTS shipping_snapshot`,
    );
  }
}
