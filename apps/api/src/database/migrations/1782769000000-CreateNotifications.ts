import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotifications1782769000000 implements MigrationInterface {
  name = 'CreateNotifications1782769000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."notification_type" AS ENUM('low_stock','out_of_stock','new_order','order_status_change','customer_archived')`,
    );
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" SERIAL PRIMARY KEY,
        "type" "public"."notification_type" NOT NULL,
        "title" varchar NOT NULL,
        "message" varchar NOT NULL,
        "related_entity_type" varchar,
        "related_entity_id" integer,
        "recipient_id" integer NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_notifications_recipient" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_recipient_id" ON "notifications"("recipient_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_is_read" ON "notifications"("is_read")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notification_type"`);
  }
}
