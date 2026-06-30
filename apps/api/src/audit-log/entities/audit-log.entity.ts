import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: false })
  entityType: string;

  @Column({ type: 'int', nullable: false })
  entityId: number;

  @Column({ type: 'enum', enum: ['create', 'update', 'delete', 'archive', 'status_change'] })
  action: 'create' | 'update' | 'delete' | 'archive' | 'status_change';

  @Column({ type: 'jsonb', nullable: true })
  changedFields: Record<string, { old: unknown; new: unknown }> | null;

  @Column({ type: 'varchar', nullable: false })
  performedBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  performedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
