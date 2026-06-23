import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../database/transformers/transformers';
import { ProductStatus } from '../../common/enums/product-status.enum';
import { SuitableFor } from '../../common/enums/suitable-for.enum';
import { Finishing } from '../../common/enums/finishing.enum';
import type { LocalizedText } from '../../common/types/localized-text.interface';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'uuid', unique: true, name: 'exact_id' })
  exactId!: string;

  // ── Multi-language ──────────────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true })
  name!: LocalizedText | null;

  @Column({ type: 'jsonb', nullable: true })
  description!: LocalizedText | null;

  // ── Exact-sourced (duplicated, read-only in PIM) ────────────────────────────

  @Column({ type: 'varchar', nullable: true })
  barcode!: string | null;

  @Column({ type: 'varchar', nullable: true })
  currency!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, transformer: decimalTransformer, name: 'base_price' })
  basePrice!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, transformer: decimalTransformer, name: 'purchase_price' })
  purchasePrice!: number | null;

  @Column({ type: 'varchar', nullable: true, name: 'sales_vat_code' })
  salesVatCode!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'purchase_vat_code' })
  purchaseVatCode!: string | null;

  // ── Internal ────────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: ProductStatus, enumName: 'product_status', default: ProductStatus.Active })
  status!: ProductStatus;

  @Column({ type: 'boolean', default: false })
  backorder!: boolean;

  @Column({ type: 'jsonb', nullable: true, name: 'country_restriction' })
  countryRestriction!: string[] | null;

  @Column({ type: 'date', nullable: true, name: 'end_date' })
  endDate!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  certificates!: Record<string, string> | null;

  @Column({ type: 'int', nullable: true, name: 'low_stock_threshold' })
  lowStockThreshold!: number | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'archived_at' })
  archivedAt!: Date | null;

  @Column({ type: 'varchar', nullable: true, name: 'updated_by' })
  updatedBy!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  // ── Measurements ────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, transformer: decimalTransformer })
  capacity!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, transformer: decimalTransformer })
  height!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, transformer: decimalTransformer })
  width!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, transformer: decimalTransformer })
  depth!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, transformer: decimalTransformer })
  weight!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, transformer: decimalTransformer })
  length!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, transformer: decimalTransformer })
  thickness!: number | null;

  // ── Extended attributes ─────────────────────────────────────────────────────

  @Column({ type: 'varchar', nullable: true, name: 'co2_emission_production' })
  co2EmissionProduction!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'co2_emission_transport' })
  co2EmissionTransport!: string | null;

  @Column({ type: 'enum', enum: SuitableFor, enumName: 'suitable_for', nullable: true, name: 'suitable_for' })
  suitableFor!: SuitableFor | null;

  @Column({ type: 'varchar', nullable: true })
  color!: string | null;

  @Column({ type: 'varchar', nullable: true })
  material!: string | null;

  @Column({ type: 'varchar', nullable: true })
  application!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'country_of_origin' })
  countryOfOrigin!: string | null;

  @Column({ type: 'enum', enum: Finishing, enumName: 'finishing', nullable: true })
  finishing!: Finishing | null;

  @Column({ type: 'boolean', nullable: true, name: 'dou_product' })
  douProduct!: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  biodegradable!: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  handmade!: boolean | null;

  @Column({ type: 'boolean', nullable: true, name: 'scratch_prone' })
  scratchProne!: boolean | null;

  @Column({ type: 'jsonb', nullable: true })
  customizable!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  accessories!: unknown[] | null;

  @Column({ type: 'jsonb', nullable: true, name: 'ring_sizing' })
  ringSizing!: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true, name: 'type_of_closure' })
  typeOfClosure!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'gemstone_type' })
  gemstoneType!: string | null;
}
