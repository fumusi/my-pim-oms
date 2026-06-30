import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../database/transformers/transformers';
import { PriceList } from './price-list.entity';
import { Product } from '../../products/entities/product.entity';

@Unique(['priceListId', 'productId'])
@Entity('price_list_items')
export class PriceListItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => PriceList, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'price_list_id' })
  priceList!: PriceList;

  @Column({ name: 'price_list_id' })
  priceListId!: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ name: 'product_id' })
  productId!: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, name: 'custom_price', transformer: decimalTransformer })
  customPrice!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: decimalTransformer })
  discount!: number | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
