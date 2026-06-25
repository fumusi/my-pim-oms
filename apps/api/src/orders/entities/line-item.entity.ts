import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../../database/transformers/transformers';
import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('line_items')
export class LineItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id' })
  orderId!: number;

  @ManyToOne(() => Order, (o) => o.lineItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'product_id' })
  productId!: number;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ type: 'varchar', name: 'product_name' })
  productName!: string;

  @Column({ type: 'varchar', nullable: true })
  sku!: string | null;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, name: 'unit_price', transformer: decimalTransformer })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, transformer: decimalTransformer })
  discount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, name: 'line_total_excl_vat', transformer: decimalTransformer })
  lineTotalExclVat!: number | null;

  @Column({ type: 'boolean', nullable: true, name: 'is_fulfillable' })
  isFulfillable!: boolean | null;
}
