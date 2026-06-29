import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriceListFkIndex1782740000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_price_lists_price_list_id" ON "customer_price_lists" ("price_list_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_customer_price_lists_price_list_id"`,
    );
  }
}
