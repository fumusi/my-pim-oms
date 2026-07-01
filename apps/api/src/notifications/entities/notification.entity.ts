import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationType } from '../../common/enums/notification-type.enum';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'enum',
    enum: NotificationType,
    enumName: 'notification_type',
  })
  type!: NotificationType;

  @Column()
  title!: string;

  @Column()
  message!: string;

  @Column({ type: 'varchar', nullable: true, name: 'related_entity_type' })
  relatedEntityType!: string | null;

  @Column({ type: 'int', nullable: true, name: 'related_entity_id' })
  relatedEntityId!: number | null;

  @Column({ name: 'recipient_id' })
  recipientId!: number;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient!: import('../../users/entities/user.entity').User;

  @Column({ type: 'boolean', default: false, name: 'is_read' })
  isRead!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
