import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'customer_id', nullable: true })
  customerId!: number | null;

  @ManyToOne(() => Customer, (c) => c.addresses, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer | null;

  @Column({ type: 'varchar' })
  street!: string;

  @Column({ type: 'varchar', name: 'house_number' })
  houseNumber!: string;

  @Column({ type: 'varchar', name: 'postal_code' })
  postalCode!: string;

  @Column({ type: 'varchar' })
  city!: string;

  @Column({ type: 'varchar', nullable: true })
  province!: string | null;

  @Column({ type: 'varchar' })
  country!: string;

  @Column({ type: 'boolean', default: false, name: 'is_primary' })
  isPrimary!: boolean;
}
