import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConfirmationTokenToUsers1781710000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "confirmation_token" varchar NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "confirmation_token"`,
    );
  }
}
