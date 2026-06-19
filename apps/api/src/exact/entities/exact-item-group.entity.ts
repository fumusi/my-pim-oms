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

  @Column({ type: 'boolean', nullable: true, name: 'is_default' })
  isDefault!: boolean | null;

  @Column({ type: 'uuid', nullable: true, name: 'gl_costs' })
  glCosts!: string | null;

  @Column({ nullable: true, type: 'varchar', name: 'gl_costs_code' })
  glCostsCode!: string | null;

  @Column({ nullable: true, type: 'varchar', name: 'gl_costs_description' })
  glCostsDescription!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'gl_revenue' })
  glRevenue!: string | null;

  @Column({ nullable: true, type: 'varchar', name: 'gl_revenue_code' })
  glRevenueCode!: string | null;

  @Column({ nullable: true, type: 'varchar', name: 'gl_revenue_description' })
  glRevenueDescription!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'gl_stock' })
  glStock!: string | null;

  @Column({ nullable: true, type: 'varchar', name: 'gl_stock_code' })
  glStockCode!: string | null;

  @Column({ nullable: true, type: 'varchar', name: 'gl_stock_description' })
  glStockDescription!: string | null;

  @Column({ type: 'uuid', nullable: true })
  creator!: string | null;

  @Column({ nullable: true, type: 'varchar', name: 'creator_full_name' })
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
