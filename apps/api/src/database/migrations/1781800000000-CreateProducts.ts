import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProducts1781800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "product_status" AS ENUM ('active', 'inactive');
      CREATE TYPE "suitable_for"   AS ENUM ('indoor', 'outdoor', 'both');
      CREATE TYPE "finishing"      AS ENUM ('matte', 'glossy', 'both');

      CREATE TABLE "products" (
        "id"                       serial          NOT NULL,
        "exact_id"                 uuid            NOT NULL,

        -- multi-language
        "name"                     jsonb,
        "description"              jsonb,

        -- exact-sourced (duplicated, read-only in PIM)
        "barcode"                  varchar,
        "currency"                 varchar,
        "base_price"               decimal(10,4),
        "purchase_price"           decimal(10,4),
        "sales_vat_code"           varchar,
        "purchase_vat_code"        varchar,

        -- internal
        "status"                   "product_status" NOT NULL DEFAULT 'active',
        "backorder"                boolean          NOT NULL DEFAULT false,
        "country_restriction"      jsonb,
        "end_date"                 date,
        "certificates"             jsonb,
        "low_stock_threshold"      int,
        "archived_at"              timestamptz,
        "updated_by"               varchar,
        "created_at"               timestamptz      NOT NULL DEFAULT now(),
        "updated_at"               timestamptz      NOT NULL DEFAULT now(),

        -- measurements
        "capacity"                 decimal(10,4),
        "height"                   decimal(10,4),
        "width"                    decimal(10,4),
        "depth"                    decimal(10,4),
        "weight"                   decimal(10,4),
        "length"                   decimal(10,4),
        "thickness"                decimal(10,4),

        -- extended attributes
        "co2_emission_production"  varchar,
        "co2_emission_transport"   varchar,
        "suitable_for"             "suitable_for",
        "color"                    varchar,
        "material"                 varchar,
        "application"              varchar,
        "country_of_origin"        varchar,
        "finishing"                "finishing",
        "dou_product"              boolean,
        "biodegradable"            boolean,
        "handmade"                 boolean,
        "scratch_prone"            boolean,
        "customizable"             jsonb,
        "accessories"              jsonb,
        "ring_sizing"              jsonb,
        "type_of_closure"          varchar,
        "gemstone_type"            varchar,

        CONSTRAINT "PK_products"           PRIMARY KEY ("id"),
        CONSTRAINT "UQ_products_exact_id"  UNIQUE ("exact_id"),
        CONSTRAINT "FK_products_exact_items"
          FOREIGN KEY ("exact_id") REFERENCES "exact_items"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TYPE "finishing"`);
    await queryRunner.query(`DROP TYPE "suitable_for"`);
    await queryRunner.query(`DROP TYPE "product_status"`);
  }
}
