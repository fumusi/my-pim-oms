import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderLineItem1782395415302 implements MigrationInterface {
  name = 'CreateOrderLineItem1782395415302';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exact_items" DROP CONSTRAINT "exact_items_category_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exact_items" DROP CONSTRAINT "exact_items_item_group_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "products_category_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "users_customer_id_fkey"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_contacts_customer_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_addresses_customer_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_customer_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_reset_token"`);
    await queryRunner.query(
      `CREATE TYPE "public"."order_status" AS ENUM('draft', 'open', 'partial', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."delivery_option" AS ENUM('dhl', 'ups', 'pickup')`,
    );
    await queryRunner.query(
      `CREATE TABLE "orders" ("id" SERIAL NOT NULL, "order_number" character varying NOT NULL, "customer_id" integer NOT NULL, "shipping_address_id" integer NOT NULL, "status" "public"."order_status" NOT NULL DEFAULT 'draft', "description" character varying, "order_source" character varying NOT NULL DEFAULT 'manual', "delivery_option" "public"."delivery_option" NOT NULL, "tracking_url" character varying, "vat_percentage" numeric(5,2), "vat_amount" numeric(10,4), "total_excl_vat" numeric(10,4), "total_incl_vat" numeric(10,4), "shipping_cost" numeric(10,4) NOT NULL DEFAULT '0', "free_shipping_applied" boolean NOT NULL DEFAULT false, "archive_reason" character varying, "archived_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, CONSTRAINT "UQ_75eba1c6b1a66b09f2a97e6927b" UNIQUE ("order_number"), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "line_items" ("id" SERIAL NOT NULL, "order_id" integer NOT NULL, "product_id" integer NOT NULL, "product_name" character varying NOT NULL, "sku" character varying, "quantity" integer NOT NULL, "unit_price" numeric(10,4) NOT NULL, "discount" numeric(5,2) NOT NULL DEFAULT '0', "line_total_excl_vat" numeric(10,4), "is_fulfillable" boolean, CONSTRAINT "PK_6d227c876e374542dc9bb44dfb4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3857e3d5137fea5865651a1be7" ON "contacts"  ("customer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7482082bf53fd0ba88a32e3de8" ON "addresses"  ("customer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_reset_token" ON "users" ("reset_token")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_customer_id" ON "users" ("customer_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "exact_items" ADD CONSTRAINT "FK_1c56359560c5fdfa76f2c6457b2" FOREIGN KEY ("item_group_id") REFERENCES "exact_item_groups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exact_items" ADD CONSTRAINT "FK_3ea89f6832454e1fdb6e0b9f90d" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_772d0ce0473ac2ccfa26060dbe9" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_67b8be57fc38bda573d2a8513ec" FOREIGN KEY ("shipping_address_id") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_9a5f6868c96e0069e699f33e124" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "line_items" ADD CONSTRAINT "FK_364f2fd50813438fe69360aef27" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "line_items" ADD CONSTRAINT "FK_450feb799862e681a2b41b6421a" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_c7bc1ffb56c570f42053fa7503b" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_c7bc1ffb56c570f42053fa7503b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "line_items" DROP CONSTRAINT "FK_450feb799862e681a2b41b6421a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "line_items" DROP CONSTRAINT "FK_364f2fd50813438fe69360aef27"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_9a5f6868c96e0069e699f33e124"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_67b8be57fc38bda573d2a8513ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_772d0ce0473ac2ccfa26060dbe9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exact_items" DROP CONSTRAINT "FK_3ea89f6832454e1fdb6e0b9f90d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exact_items" DROP CONSTRAINT "FK_1c56359560c5fdfa76f2c6457b2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7482082bf53fd0ba88a32e3de8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3857e3d5137fea5865651a1be7"`,
    );
    await queryRunner.query(`DROP TABLE "line_items"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TYPE "public"."delivery_option"`);
    await queryRunner.query(`DROP TYPE "public"."order_status"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_users_reset_token" ON "users" USING btree ("reset_token") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_customer_id" ON "users" USING btree ("customer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_addresses_customer_id" ON "addresses" USING btree ("customer_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_contacts_customer_id" ON "contacts" USING btree ("customer_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "users_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exact_items" ADD CONSTRAINT "exact_items_item_group_id_fkey" FOREIGN KEY ("item_group_id") REFERENCES "exact_item_groups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exact_items" ADD CONSTRAINT "exact_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
