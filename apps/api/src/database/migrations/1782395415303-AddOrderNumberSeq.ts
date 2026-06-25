import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderNumberSeq1782395415303 implements MigrationInterface {
  name = 'AddOrderNumberSeq1782395415303';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`CREATE SEQUENCE IF NOT EXISTS order_number_seq`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP SEQUENCE IF EXISTS order_number_seq`);
  }
}
