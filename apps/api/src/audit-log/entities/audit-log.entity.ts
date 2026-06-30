import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: false, name: 'entity_type' })
  entityType: string;

  @Column({ type: 'int', nullable: false, name: 'entity_id' })
  entityId: number;

  @Column({ type: 'enum', enum: ['create', 'update', 'delete', 'archive', 'status_change'], enumName: 'audit_log_action_enum' })
  action: 'create' | 'update' | 'delete' | 'archive' | 'status_change';

  @Column({ type: 'jsonb', nullable: true, name: 'changed_fields' })
  changedFields: Record<string, { old: unknown; new: unknown }> | null;

  @Column({ type: 'varchar', nullable: false, name: 'performed_by' })
  performedBy: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'performed_at' })
  performedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
