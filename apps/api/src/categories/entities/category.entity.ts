import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CategoryStatus } from '../../common/enums/category-status.enum';
import type { LocalizedText } from '../../common/types/localized-text.interface';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'jsonb' })
  name!: LocalizedText;

  @Column({ type: 'jsonb', nullable: true })
  description!: LocalizedText | null;

  @Column({ type: 'varchar', nullable: true })
  image!: string | null;

  @Column({ type: 'varchar', nullable: true })
  icon!: string | null;

  @Column({ type: 'enum', enum: CategoryStatus, default: CategoryStatus.Active })
  status!: CategoryStatus;

  @Column({ type: 'jsonb', nullable: true })
  template!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'varchar', nullable: true, name: 'updated_by' })
  updatedBy!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'archived_at' })
  archivedAt!: Date | null;
}
