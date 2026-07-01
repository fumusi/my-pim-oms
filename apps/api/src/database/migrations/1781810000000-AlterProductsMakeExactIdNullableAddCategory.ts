import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterProductsMakeExactIdNullableAddCategory1781810000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_products_exact_items"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "exact_id" DROP NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD COLUMN "category_id" int
          REFERENCES "categories"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "category_id"`);
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "exact_id" SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD CONSTRAINT "FK_products_exact_items"
          FOREIGN KEY ("exact_id") REFERENCES "exact_items"("id")
    `);
  }
}
