import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationsUnreadPartialIndex1782770000000
  implements MigrationInterface
{
  name = 'AddNotificationsUnreadPartialIndex1782770000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_is_read"`);
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_recipient_unread" ON "notifications" ("recipient_id") WHERE "is_read" = false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_notifications_recipient_unread"`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_is_read" ON "notifications"("is_read")`,
    );
  }
}
