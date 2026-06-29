import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPriceLists1782737187170 implements MigrationInterface {
    name = 'AddPriceLists1782737187170'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."price_list_status" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "price_lists" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "start_date" date, "end_date" date, "status" "public"."price_list_status" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character varying, "updated_by" character varying, "archived_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_fd66ee20b065696da25c97fa45a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "customer_price_lists" ("customer_id" integer NOT NULL, "price_list_id" integer NOT NULL, "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "assigned_by" character varying, CONSTRAINT "PK_a00db8a8f9593011f3a08916bb9" PRIMARY KEY ("customer_id", "price_list_id"))`);
        await queryRunner.query(`CREATE TABLE "price_list_items" ("id" SERIAL NOT NULL, "price_list_id" integer NOT NULL, "product_id" integer NOT NULL, "custom_price" numeric(10,4) NOT NULL, "discount" numeric(5,2), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_926faa7950bce402545cf664e1b" UNIQUE ("price_list_id", "product_id"), CONSTRAINT "PK_cdb44449658589feac39de86695" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "customer_price_lists" ADD CONSTRAINT "FK_3532865cf4d0e562ca4605b0ab5" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "customer_price_lists" ADD CONSTRAINT "FK_86e62aff1e1f731253179589ddf" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "price_list_items" ADD CONSTRAINT "FK_2576ee6c421b653f85011b9f5ac" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "price_list_items" ADD CONSTRAINT "FK_e21fbf5b1d5ca8781e2fc12e752" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "price_list_items" DROP CONSTRAINT "FK_e21fbf5b1d5ca8781e2fc12e752"`);
        await queryRunner.query(`ALTER TABLE "price_list_items" DROP CONSTRAINT "FK_2576ee6c421b653f85011b9f5ac"`);
        await queryRunner.query(`ALTER TABLE "customer_price_lists" DROP CONSTRAINT "FK_86e62aff1e1f731253179589ddf"`);
        await queryRunner.query(`ALTER TABLE "customer_price_lists" DROP CONSTRAINT "FK_3532865cf4d0e562ca4605b0ab5"`);
        await queryRunner.query(`DROP TABLE "price_list_items"`);
        await queryRunner.query(`DROP TABLE "customer_price_lists"`);
        await queryRunner.query(`DROP TABLE "price_lists"`);
        await queryRunner.query(`DROP TYPE "public"."price_list_status"`);
    }

}
