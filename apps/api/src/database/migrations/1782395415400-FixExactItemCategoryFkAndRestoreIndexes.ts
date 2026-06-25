import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixExactItemCategoryFkAndRestoreIndexes1782395415400 implements MigrationInterface {
  name = 'FixExactItemCategoryFkAndRestoreIndexes1782395415400';

  async up(qr: QueryRunner): Promise<void> {
    // Fix exact_items.category_id FK: was incorrectly set to ON DELETE NO ACTION
    await qr.query(`ALTER TABLE "exact_items" DROP CONSTRAINT IF EXISTS "FK_3ea89f6832454e1fdb6e0b9f90d"`);
    await qr.query(`ALTER TABLE "exact_items" ADD CONSTRAINT "exact_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

    // Restore indexes dropped by migration 1782395415302 and never re-created
    await qr.query(`CREATE INDEX IF NOT EXISTS "IDX_users_reset_token" ON "users" ("reset_token")`);
    await qr.query(`CREATE INDEX IF NOT EXISTS "idx_users_customer_id" ON "users" ("customer_id")`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS "idx_users_customer_id"`);
    await qr.query(`DROP INDEX IF EXISTS "IDX_users_reset_token"`);
    await qr.query(`ALTER TABLE "exact_items" DROP CONSTRAINT IF EXISTS "exact_items_category_id_fkey"`);
    await qr.query(`ALTER TABLE "exact_items" ADD CONSTRAINT "FK_3ea89f6832454e1fdb6e0b9f90d" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }
}
