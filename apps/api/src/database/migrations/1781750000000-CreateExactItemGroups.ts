import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExactItemGroups1781750000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "exact_item_groups" (
        "id"                    uuid          NOT NULL,
        "code"                  varchar,
        "description"           varchar,
        "division"              int,
        "is_default"            smallint,
        "gl_costs"              uuid,
        "gl_costs_code"         varchar,
        "gl_costs_description"  varchar,
        "gl_revenue"            uuid,
        "gl_revenue_code"       varchar,
        "gl_revenue_description" varchar,
        "gl_stock"              uuid,
        "gl_stock_code"         varchar,
        "gl_stock_description"  varchar,
        "creator"               uuid,
        "creator_full_name"     varchar,
        "modifier"              uuid,
        "created"               timestamptz,
        "modified"              timestamptz,
        CONSTRAINT "PK_exact_item_groups" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "exact_item_groups"`);
  }
}
