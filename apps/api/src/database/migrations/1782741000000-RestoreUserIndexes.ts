import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestoreUserIndexes1782741000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_reset_token" ON "users" USING btree ("reset_token")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_users_customer_id" ON "users" USING btree ("customer_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_customer_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_reset_token"`);
  }
}
