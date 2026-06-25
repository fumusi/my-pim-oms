import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerIdToUsers1782374600000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE users
      ADD COLUMN customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL
    `);
    await qr.query(`CREATE INDEX idx_users_customer_id ON users(customer_id)`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS idx_users_customer_id`);
    await qr.query(`ALTER TABLE users DROP COLUMN customer_id`);
  }
}
