import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPimTemplateToExactItems1781780000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "exact_items"
        ADD COLUMN "pim_template" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exact_items" DROP COLUMN "pim_template"`,
    );
  }
}
