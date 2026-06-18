import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('exact_online_tokens')
export class ExactOnlineToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'access_token', type: 'text' })
  access_token!: string;

  @Column({ name: 'refresh_token', type: 'text' })
  refresh_token!: string;

  @Column({
    name: 'expires_at',
    type: 'bigint',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  expires_at!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
