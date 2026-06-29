import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { PriceList } from './price-list.entity';

@Entity('customer_price_lists')
export class CustomerPriceList {
  @PrimaryColumn({ name: 'customer_id' })
  customerId!: number;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @PrimaryColumn({ name: 'price_list_id' })
  priceListId!: number;

  @ManyToOne(() => PriceList, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'price_list_id' })
  priceList!: PriceList;

  @CreateDateColumn({ type: 'timestamptz', name: 'assigned_at' })
  assignedAt!: Date;

  @Column({ type: 'varchar', nullable: true, name: 'assigned_by' })
  assignedBy!: string | null;
}
