import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexResetToken1781700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_users_reset_token" ON "users" ("reset_token")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_users_reset_token"`);
  }
}
