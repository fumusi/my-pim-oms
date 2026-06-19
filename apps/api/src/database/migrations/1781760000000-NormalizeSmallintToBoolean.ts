import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeSmallintToBoolean1781760000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "exact_items"
        ALTER COLUMN "is_batch_number_item" TYPE boolean USING ("is_batch_number_item" != 0),
        ALTER COLUMN "is_batch_item"        TYPE boolean USING ("is_batch_item"        != 0),
        ALTER COLUMN "is_webshop_item"      TYPE boolean USING ("is_webshop_item"      != 0),
        ALTER COLUMN "is_serial_number_item" TYPE boolean USING ("is_serial_number_item" != 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "exact_item_groups"
        ALTER COLUMN "is_default" TYPE boolean USING ("is_default" != 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "exact_items"
        ALTER COLUMN "is_batch_number_item"  TYPE smallint USING ("is_batch_number_item"::int),
        ALTER COLUMN "is_batch_item"         TYPE smallint USING ("is_batch_item"::int),
        ALTER COLUMN "is_webshop_item"       TYPE smallint USING ("is_webshop_item"::int),
        ALTER COLUMN "is_serial_number_item" TYPE smallint USING ("is_serial_number_item"::int)
    `);

    await queryRunner.query(`
      ALTER TABLE "exact_item_groups"
        ALTER COLUMN "is_default" TYPE smallint USING ("is_default"::int)
    `);
  }
}
