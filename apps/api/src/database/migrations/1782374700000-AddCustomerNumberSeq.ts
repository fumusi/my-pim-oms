import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerNumberSeq1782374700000 implements MigrationInterface {
  name = 'AddCustomerNumberSeq1782374700000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`CREATE SEQUENCE IF NOT EXISTS customer_number_seq`);
    await qr.query(`
      SELECT setval(
        'customer_number_seq',
        COALESCE(
          MAX(CAST(SUBSTRING(customer_number FROM 6) AS INTEGER)),
          0
        )
      )
      FROM customers
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP SEQUENCE IF EXISTS customer_number_seq`);
  }
}
