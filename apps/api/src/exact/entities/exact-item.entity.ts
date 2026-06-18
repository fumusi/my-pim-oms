import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ExactItemGroup } from './exact-item-group.entity';
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

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 4, transformer: decimalTransformer })
  standardSalesPrice!: number | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 4, transformer: decimalTransformer })
  costPriceStandard!: number | null;

  @Column({ nullable: true, type: 'varchar' })
  costPriceCurrency!: string | null;

  @Column({ type: 'smallint', nullable: true })
  isBatchNumberItem!: number | null;

  @Column({ type: 'smallint', nullable: true })
  isBatchItem!: number | null;

  @Column({ nullable: true, type: 'boolean' })
  isFractionAllowedItem!: boolean | null;

  @Column({ nullable: true, type: 'boolean' })
  isPackageItem!: boolean | null;

  @Column({ nullable: true, type: 'boolean' })
  isPurchaseItem!: boolean | null;

  @Column({ nullable: true, type: 'boolean' })
  isSalesItem!: boolean | null;

  @Column({ nullable: true, type: 'boolean' })
  isSerialItem!: boolean | null;

  @Column({ nullable: true, type: 'boolean' })
  isStockItem!: boolean | null;

  @Column({ type: 'smallint', nullable: true })
  isWebshopItem!: number | null;

  @Column({ type: 'smallint', nullable: true })
  isSerialNumberItem!: number | null;

  @Column({ nullable: true, type: 'boolean' })
  isTaxableItem!: boolean | null;

  @Column({ nullable: true, type: 'varchar' })
  barcode!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  extraDescription!: string | null;

  @Column({ nullable: true, type: 'text' })
  notes!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  searchCode!: string | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 4, transformer: decimalTransformer })
  averageCost!: number | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 4, transformer: decimalTransformer })
  grossWeight!: number | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 4, transformer: decimalTransformer })
  netWeight!: number | null;

  @Column({ nullable: true, type: 'varchar' })
  netWeightUnit!: string | null;

  @ManyToOne(() => ExactItemGroup, (group) => group.items, { nullable: true })
  @JoinColumn({ name: 'item_group_id' })
  itemGroup!: ExactItemGroup | null;

  @Column({ nullable: true, type: 'varchar' })
  itemGroupCode!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  itemGroupDescription!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  salesVatCode!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  salesVatCodeDescription!: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  startDate!: Date | null;

  @Column({ nullable: true, type: 'timestamptz' })
  endDate!: Date | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 4, transformer: decimalTransformer })
  stock!: number | null;

  @Column({ nullable: true, type: 'varchar' })
  unit!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  unitDescription!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  unitType!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  pictureUrl!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  pictureThumbnailUrl!: string | null;

  @Column({ type: 'uuid', nullable: true })
  creator!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  creatorFullName!: string | null;

  @Column({ type: 'uuid', nullable: true })
  modifier!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  modifierFullName!: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  created!: Date | null;

  @Column({ nullable: true, type: 'timestamptz' })
  modified!: Date | null;
}
