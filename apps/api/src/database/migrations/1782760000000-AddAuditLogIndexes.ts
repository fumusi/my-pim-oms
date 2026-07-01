import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogIndexes1782760000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_entity_type_entity_id" ON "audit_logs" ("entity_type", "entity_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_performed_at" ON "audit_logs" ("performed_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_performed_at"`);
    await queryRunner.query(
      `DROP INDEX "IDX_audit_logs_entity_type_entity_id"`,
    );
  }
}
