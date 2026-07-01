import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUpdatedByToExactItems1781790000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE exact_items ADD COLUMN IF NOT EXISTS updated_by varchar NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE exact_items DROP COLUMN IF EXISTS updated_by`,
    );
  }
}
