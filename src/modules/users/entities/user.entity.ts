import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Document } from '../../documents/entities/document.entity';
import { IngestionJob } from '../../ingestion/entities/ingestion-job.entity';
import { Role } from './role.entity';
import { RefreshToken } from './refresh-token.entity';

export { UserRole } from '../../../common/enums/user-role.enum';

@Entity('users')
@Index('idx_users_email', ['email'], { unique: true })
@Index('idx_users_role_id', ['roleId'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @ManyToOne(() => Role, (role) => role.users, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'is_active', type: 'boolean', default: true, nullable: true })
  isActive: boolean | null;

  @OneToMany(() => Document, (document) => document.uploadedBy)
  documents: Document[];

  @OneToMany(() => IngestionJob, (job) => job.triggeredBy)
  ingestionJobs: IngestionJob[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
