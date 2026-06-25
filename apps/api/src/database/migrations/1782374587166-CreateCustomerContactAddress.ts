import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCustomerContactAddress1782374587166 implements MigrationInterface {
    name = 'CreateCustomerContactAddress1782374587166'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "exact_items" DROP CONSTRAINT "exact_items_item_group_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "exact_items" DROP CONSTRAINT "exact_items_category_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "products_category_id_fkey"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_users_reset_token"`);
        await queryRunner.query(`CREATE TABLE "contacts" ("id" SERIAL NOT NULL, "customer_id" integer NOT NULL, "first_name" character varying NOT NULL, "last_name" character varying NOT NULL, "email" character varying, "phone_number" character varying, "is_primary" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_b99cd40cfd66a99f1571f4f72e6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."customer_status" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "customers" ("id" SERIAL NOT NULL, "customer_number" character varying NOT NULL, "name" character varying(250) NOT NULL, "company_name" character varying, "email" character varying NOT NULL, "phone_number" character varying, "country" character varying NOT NULL, "vat_number" character varying, "status" "public"."customer_status" NOT NULL DEFAULT 'active', "end_date" date, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "archived_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_6fbe8c55d8dd968877d296493e3" UNIQUE ("customer_number"), CONSTRAINT "UQ_8536b8b85c06969f84f0c098b03" UNIQUE ("email"), CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "addresses" ("id" SERIAL NOT NULL, "customer_id" integer NOT NULL, "street" character varying NOT NULL, "house_number" character varying NOT NULL, "postal_code" character varying NOT NULL, "city" character varying NOT NULL, "province" character varying, "country" character varying NOT NULL, "is_primary" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_745d8f43d3af10ab8247465e450" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD CONSTRAINT "FK_3857e3d5137fea5865651a1be75" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "addresses" ADD CONSTRAINT "FK_7482082bf53fd0ba88a32e3de88" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exact_items" ADD CONSTRAINT "FK_1c56359560c5fdfa76f2c6457b2" FOREIGN KEY ("item_group_id") REFERENCES "exact_item_groups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exact_items" ADD CONSTRAINT "FK_3ea89f6832454e1fdb6e0b9f90d" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_9a5f6868c96e0069e699f33e124" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_9a5f6868c96e0069e699f33e124"`);
        await queryRunner.query(`ALTER TABLE "exact_items" DROP CONSTRAINT "FK_3ea89f6832454e1fdb6e0b9f90d"`);
        await queryRunner.query(`ALTER TABLE "exact_items" DROP CONSTRAINT "FK_1c56359560c5fdfa76f2c6457b2"`);
        await queryRunner.query(`ALTER TABLE "addresses" DROP CONSTRAINT "FK_7482082bf53fd0ba88a32e3de88"`);
        await queryRunner.query(`ALTER TABLE "contacts" DROP CONSTRAINT "FK_3857e3d5137fea5865651a1be75"`);
        await queryRunner.query(`DROP TABLE "addresses"`);
        await queryRunner.query(`DROP TABLE "customers"`);
        await queryRunner.query(`DROP TYPE "public"."customer_status"`);
        await queryRunner.query(`DROP TABLE "contacts"`);
        await queryRunner.query(`CREATE INDEX "IDX_users_reset_token" ON "users" USING btree ("reset_token") `);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exact_items" ADD CONSTRAINT "exact_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "exact_items" ADD CONSTRAINT "exact_items_item_group_id_fkey" FOREIGN KEY ("item_group_id") REFERENCES "exact_item_groups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
