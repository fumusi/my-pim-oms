import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../database/transformers/transformers';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { DeliveryOption } from '../../common/enums/delivery-option.enum';
import { Customer } from '../../customers/entities/customer.entity';
import { Address } from '../../customers/entities/address.entity';
import { LineItem } from './line-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, name: 'order_number', update: false })
  orderNumber!: string;

  @Column({ name: 'customer_id' })
  customerId!: number;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @Column({ name: 'shipping_address_id' })
  shippingAddressId!: number;

  @ManyToOne(() => Address, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'shipping_address_id' })
  shippingAddress!: Address;

  @Column({ type: 'enum', enum: OrderStatus, enumName: 'order_status', default: OrderStatus.Draft })
  status!: OrderStatus;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', name: 'order_source', default: 'manual', update: false })
  orderSource!: string;

  @Column({ type: 'enum', enum: DeliveryOption, enumName: 'delivery_option', name: 'delivery_option' })
  deliveryOption!: DeliveryOption;

  @Column({ type: 'varchar', nullable: true, name: 'tracking_url' })
  trackingUrl!: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'vat_percentage', transformer: decimalTransformer })
  vatPercentage!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, name: 'vat_amount', transformer: decimalTransformer })
  vatAmount!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, name: 'total_excl_vat', transformer: decimalTransformer })
  totalExclVat!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, name: 'total_incl_vat', transformer: decimalTransformer })
  totalInclVat!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0, name: 'shipping_cost', transformer: decimalTransformer })
  shippingCost!: number;

  @Column({ type: 'boolean', default: false, name: 'free_shipping_applied' })
  freeShippingApplied!: boolean;

  @Column({ type: 'varchar', nullable: true, name: 'archive_reason' })
  archiveReason!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'archived_at' })
  archivedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'varchar', nullable: true, name: 'created_by' })
  createdBy!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'updated_by' })
  updatedBy!: string | null;

  @OneToMany(() => LineItem, (li) => li.order)
  lineItems!: LineItem[];
}
