import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ExactItemGroup } from './exact-item-group.entity';
import { Category } from '../../categories/entities/category.entity';
import { decimalTransformer } from '../../database/transformers/transformers';

@Entity('exact_items')
export class ExactItem {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ nullable: true, type: 'varchar' })
  code!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  description!: string | null;

  @Column({ nullable: true, type: 'int' })
  division!: number | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 4, transformer: decimalTransformer, name: 'standard_sales_price' })
  standardSalesPrice!: number | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 4, transformer: decimalTransformer, name: 'cost_price_standard' })
  costPriceStandard!: number | null;

  @Column({ nullable: true, type: 'varchar', name: 'cost_price_currency' })
  costPriceCurrency!: string | null;

  @Column({ type: 'boolean', nullable: true, name: 'is_batch_number_item' })
  isBatchNumberItem!: boolean | null;

  @Column({ type: 'boolean', nullable: true, name: 'is_batch_item' })
  isBatchItem!: boolean | null;

  @Column({ nullable: true, type: 'boolean', name: 'is_fraction_allowed_item' })
  isFractionAllowedItem!: boolean | null;

  @Column({ nullable: true, type: 'boolean', name: 'is_package_item' })
  isPackageItem!: boolean | null;

  @Column({ nullable: true, type: 'boolean', name: 'is_purchase_item' })
  isPurchaseItem!: boolean | null;

  @Column({ nullable: true, type: 'boolean', name: 'is_sales_item' })
  isSalesItem!: boolean | null;

  @Column({ nullable: true, type: 'boolean', name: 'is_serial_item' })
  isSerialItem!: boolean | null;

  @Column({ nullable: true, type: 'boolean', name: 'is_stock_item' })
  isStockItem!: boolean | null;

  @Column({ type: 'boolean', nullable: true, name: 'is_webshop_item' })
  isWebshopItem!: boolean | null;

  @Column({ type: 'boolean', nullable: true, name: 'is_serial_number_item' })
  isSerialNumberItem!: boolean | null;

  @Column({ nullable: true, type: 'boolean', name: 'is_taxable_item' })
  isTaxableItem!: boolean | null;

  @Column({ nullable: true, type: 'varchar' })
  barcode!: string | null;

  @Column({ nullable: true, type: 'varchar', name: 'extra_description' })
  extraDescription!: string | null;

  @Column({ nullable: true, type: 'text' })
  notes!: string | null;

  @Column({ nullable: true, type: 'varchar', name: 'search_code' })
  searchCode!: string | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 4, transformer: decimalTransformer, name: 'average_cost' })
  averageCost!: number | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 4, transformer: decimalTransformer, name: 'gross_weight' })
  grossWeight!: number | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 4, transformer: decimalTransformer, name: 'net_weight' })
  netWeight!: number | null;

  @Column({ nullable: true, type: 'varchar', name: 'net_weight_unit' })
  netWeightUnit!: string | null;

  @ManyToOne(() => ExactItemGroup, (group) => group.items, { nullable: true })
  @JoinColumn({ name: 'item_group_id' })
  itemGroup!: ExactItemGroup | null;

  @ManyToOne(() => Category, (cat) => cat.products, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category!: Category | null;

  @Column({ nullable: true, type: 'varchar', name: 'item_group_code' })
  itemGroupCode!: string | null;

  @Column({ nullable: true, type: 'varchar', name: 'item_group_description' })
  itemGroupDescription!: string | null;

  @Column({ nullable: true, type: 'varchar', name: 'sales_vat_code' })
  salesVatCode!: string | null;

  @Column({ nullable: true, type: 'varchar', name: 'sales_vat_code_description' })
  salesVatCodeDescription!: string | null;

  @Column({ nullable: true, type: 'timestamptz', name: 'start_date' })
  startDate!: Date | null;

  @Column({ nullable: true, type: 'timestamptz', name: 'end_date' })
  endDate!: Date | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 4, transformer: decimalTransformer })
  stock!: number | null;

  @Column({ nullable: true, type: 'varchar' })
  unit!: string | null;

  @Column({ nullable: true, type: 'varchar', name: 'unit_description' })
  unitDescription!: string | null;

  @Column({ nullable: true, type: 'varchar', name: 'unit_type' })
  unitType!: string | null;

  @Column({ nullable: true, type: 'varchar', name: 'picture_url' })
  pictureUrl!: string | null;

  @Column({ nullable: true, type: 'varchar', name: 'picture_thumbnail_url' })
  pictureThumbnailUrl!: string | null;

  @Column({ type: 'uuid', nullable: true })
  creator!: string | null;

  @Column({ nullable: true, type: 'varchar', name: 'creator_full_name' })
  creatorFullName!: string | null;

  @Column({ type: 'uuid', nullable: true })
  modifier!: string | null;

  @Column({ nullable: true, type: 'varchar', name: 'modifier_full_name' })
  modifierFullName!: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  created!: Date | null;

  @Column({ nullable: true, type: 'timestamptz' })
  modified!: Date | null;
}
