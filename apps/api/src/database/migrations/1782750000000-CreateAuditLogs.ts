import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogs1782750000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "audit_log_action_enum" AS ENUM ('create', 'update', 'delete', 'archive', 'status_change')`,
    );
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" SERIAL NOT NULL,
        "entity_type" character varying NOT NULL,
        "entity_id" integer NOT NULL,
        "action" "audit_log_action_enum" NOT NULL,
        "changed_fields" jsonb,
        "performed_by" character varying NOT NULL,
        "performed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "metadata" jsonb,
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "audit_log_action_enum"`);
  }
}
