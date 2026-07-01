import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategories1781770000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "categories_status_enum" AS ENUM ('active', 'inactive')
    `);

    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id"          SERIAL PRIMARY KEY,
        "name"        jsonb        NOT NULL,
        "description" jsonb,
        "image"       varchar,
        "icon"        varchar,
        "status"      "categories_status_enum" NOT NULL DEFAULT 'active',
        "template"    jsonb,
        "created_at"  timestamptz  NOT NULL DEFAULT now(),
        "updated_at"  timestamptz  NOT NULL DEFAULT now(),
        "updated_by"  varchar,
        "archived_at" timestamptz
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "exact_items"
        ADD COLUMN "category_id" integer
          REFERENCES "categories"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exact_items" DROP COLUMN "category_id"`,
    );
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TYPE "categories_status_enum"`);
  }
}
