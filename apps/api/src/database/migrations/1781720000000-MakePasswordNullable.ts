import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakePasswordNullable1781720000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // OAuth-only users (password IS NULL) cannot survive a rollback to NOT NULL —
    // they are deleted rather than corrupted with a fake empty-string hash.
    await queryRunner.query(`DELETE FROM "users" WHERE "password" IS NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL`);
  }
}
