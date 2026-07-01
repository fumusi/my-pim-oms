import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNominalShippingCostToOrders1782395415500 implements MigrationInterface {
  name = 'AddNominalShippingCostToOrders1782395415500';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE "orders" ADD "nominal_shipping_cost" numeric(10,4) NOT NULL DEFAULT '0'`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE "orders" DROP COLUMN "nominal_shipping_cost"`);
  }
}
