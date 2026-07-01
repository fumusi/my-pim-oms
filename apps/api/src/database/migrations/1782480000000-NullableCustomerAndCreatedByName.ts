import { MigrationInterface, QueryRunner } from 'typeorm';

export class NullableCustomerAndCreatedByName1782480000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE orders ALTER COLUMN customer_id DROP NOT NULL`);
    await qr.query(
      `ALTER TABLE orders ALTER COLUMN shipping_address_id DROP NOT NULL`,
    );
    await qr.query(
      `ALTER TABLE addresses ALTER COLUMN customer_id DROP NOT NULL`,
    );
    await qr.query(
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by_name VARCHAR`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE orders DROP COLUMN IF EXISTS created_by_name`);
    await qr.query(
      `ALTER TABLE addresses ALTER COLUMN customer_id SET NOT NULL`,
    );
    await qr.query(
      `ALTER TABLE orders ALTER COLUMN shipping_address_id SET NOT NULL`,
    );
    await qr.query(`ALTER TABLE orders ALTER COLUMN customer_id SET NOT NULL`);
  }
}
