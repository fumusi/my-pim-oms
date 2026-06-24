import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPimTemplateToProducts1781840000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD COLUMN "pim_template" JSONB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
        DROP COLUMN "pim_template"
    `);
  }
}
