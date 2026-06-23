import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockToProducts1781820000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products" ADD COLUMN "stock" decimal(10,4)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "stock"`);
  }
}
