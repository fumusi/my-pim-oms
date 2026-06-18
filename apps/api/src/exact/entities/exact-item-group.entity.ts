import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { ExactItem } from './exact-item.entity';

@Entity('exact_item_groups')
export class ExactItemGroup {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ nullable: true, type: 'varchar' })
  code!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  description!: string | null;

  @Column({ nullable: true, type: 'int' })
  division!: number | null;

  @Column({ type: 'smallint', nullable: true })
  isDefault!: number | null;

  @Column({ type: 'uuid', nullable: true })
  glCosts!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  glCostsCode!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  glCostsDescription!: string | null;

  @Column({ type: 'uuid', nullable: true })
  glRevenue!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  glRevenueCode!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  glRevenueDescription!: string | null;

  @Column({ type: 'uuid', nullable: true })
  glStock!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  glStockCode!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  glStockDescription!: string | null;

  @Column({ type: 'uuid', nullable: true })
  creator!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  creatorFullName!: string | null;

  @Column({ type: 'uuid', nullable: true })
  modifier!: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  created!: Date | null;

  @Column({ nullable: true, type: 'timestamptz' })
  modified!: Date | null;

  @OneToMany(() => ExactItem, (item) => item.itemGroup)
  items!: ExactItem[];
}
