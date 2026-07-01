import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixExactItemCategoryFkAndRestoreIndexes1782395415400 implements MigrationInterface {
  name = 'FixExactItemCategoryFkAndRestoreIndexes1782395415400';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE "exact_items" DROP CONSTRAINT IF EXISTS "FK_3ea89f6832454e1fdb6e0b9f90d"`,
    );
    await qr.query(
      `ALTER TABLE "exact_items" ADD CONSTRAINT "exact_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE "exact_items" DROP CONSTRAINT IF EXISTS "exact_items_category_id_fkey"`,
    );
    await qr.query(
      `ALTER TABLE "exact_items" ADD CONSTRAINT "FK_3ea89f6832454e1fdb6e0b9f90d" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
