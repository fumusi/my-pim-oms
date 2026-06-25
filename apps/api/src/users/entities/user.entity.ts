import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '../../common/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column({ type: 'varchar', nullable: true })
  password!: string | null;

  @Column({ type: 'enum', enum: Role, default: Role.User })
  role!: Role;

  @Column({ type: 'varchar', nullable: true, name: 'first_name' })
  firstName!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'last_name' })
  lastName!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'phone_number' })
  phoneNumber!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'avatar_url' })
  avatarUrl!: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'varchar', nullable: true, name: 'confirmation_token' })
  confirmationToken!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'reset_token' })
  resetToken!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'reset_token_expires_at' })
  resetTokenExpiresAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'int', nullable: true, name: 'customer_id' })
  customerId!: number | null;

  @ManyToOne('Customer', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer!: import('../../customers/entities/customer.entity').Customer | null;
}
