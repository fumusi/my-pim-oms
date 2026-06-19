import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExactItems1781751000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "exact_items" (
        "id"                        uuid          NOT NULL,
        "code"                      varchar,
        "description"               varchar,
        "division"                  int,
        "standard_sales_price"      decimal(10,4),
        "cost_price_standard"       decimal(10,4),
        "cost_price_currency"       varchar,
        "is_batch_number_item"      smallint,
        "is_batch_item"             smallint,
        "is_fraction_allowed_item"  boolean,
        "is_package_item"           boolean,
        "is_purchase_item"          boolean,
        "is_sales_item"             boolean,
        "is_serial_item"            boolean,
        "is_stock_item"             boolean,
        "is_webshop_item"           smallint,
        "is_serial_number_item"     smallint,
        "is_taxable_item"           boolean,
        "barcode"                   varchar,
        "extra_description"         varchar,
        "notes"                     text,
        "search_code"               varchar,
        "average_cost"              decimal(10,4),
        "gross_weight"              decimal(10,4),
        "net_weight"                decimal(10,4),
        "net_weight_unit"           varchar,
        "item_group_id"             uuid          REFERENCES "exact_item_groups"("id"),
        "item_group_code"           varchar,
        "item_group_description"    varchar,
        "sales_vat_code"            varchar,
        "sales_vat_code_description" varchar,
        "start_date"                timestamptz,
        "end_date"                  timestamptz,
        "stock"                     decimal(10,4),
        "unit"                      varchar,
        "unit_description"          varchar,
        "unit_type"                 varchar,
        "picture_url"               varchar,
        "picture_thumbnail_url"     varchar,
        "creator"                   uuid,
        "creator_full_name"         varchar,
        "modifier"                  uuid,
        "modifier_full_name"        varchar,
        "created"                   timestamptz,
        "modified"                  timestamptz,
        CONSTRAINT "PK_exact_items" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "exact_items"`);
  }
}
