import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExactOnlineTokens1781752000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "exact_online_tokens" (
        "id"            SERIAL        NOT NULL,
        "access_token"  text          NOT NULL,
        "refresh_token" text          NOT NULL,
        "expires_at"    bigint        NOT NULL,
        "created_at"    timestamptz   NOT NULL DEFAULT now(),
        "updated_at"    timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_exact_online_tokens" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "exact_online_tokens"`);
  }
}
