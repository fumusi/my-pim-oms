import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PriceListStatus } from '../../common/enums/price-list-status.enum';
import { PriceListItem } from './price-list-item.entity';

@Entity('price_lists')
export class PriceList {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ type: 'date', nullable: true, name: 'start_date' })
  startDate!: string | null;

  @Column({ type: 'date', nullable: true, name: 'end_date' })
  endDate!: string | null;

  @Column({ type: 'enum', enum: PriceListStatus, enumName: 'price_list_status', default: PriceListStatus.Active })
  status!: PriceListStatus;

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

  @OneToMany(() => PriceListItem, (item) => item.priceList)
  items!: PriceListItem[];
}
