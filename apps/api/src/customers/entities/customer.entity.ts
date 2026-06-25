import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerStatus } from '../../common/enums/customer-status.enum';
import { Contact } from './contact.entity';
import { Address } from './address.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, name: 'customer_number' })
  customerNumber!: string;

  @Column({ type: 'varchar', length: 250 })
  name!: string;

  @Column({ type: 'varchar', nullable: true, name: 'company_name' })
  companyName!: string | null;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ type: 'varchar', nullable: true, name: 'phone_number' })
  phoneNumber!: string | null;

  @Column({ type: 'varchar' })
  country!: string;

  @Column({ type: 'varchar', nullable: true, name: 'vat_number' })
  vatNumber!: string | null;

  @Column({ type: 'enum', enum: CustomerStatus, enumName: 'customer_status', default: CustomerStatus.Active })
  status!: CustomerStatus;

  @Column({ type: 'date', nullable: true, name: 'end_date' })
  endDate!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'varchar', nullable: true, name: 'created_by' })
  createdBy!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'updated_by' })
  updatedBy!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'archived_at' })
  archivedAt!: Date | null;

  @OneToMany(() => Contact, (c) => c.customer)
  contacts!: Contact[];

  @OneToMany(() => Address, (a) => a.customer)
  addresses!: Address[];
}
