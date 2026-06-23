import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationTimestampsToProducts1781830000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD COLUMN "last_low_stock_notified_at"     TIMESTAMPTZ,
        ADD COLUMN "last_out_of_stock_notified_at"  TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
        DROP COLUMN "last_low_stock_notified_at",
        DROP COLUMN "last_out_of_stock_notified_at"
    `);
  }
}
