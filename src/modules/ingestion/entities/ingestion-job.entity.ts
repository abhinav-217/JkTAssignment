import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { IngestionStatus } from '../../../common/enums/ingestion-status.enum';
import { Document } from '../../documents/entities/document.entity';
import { User } from '../../users/entities/user.entity';

@Entity('ingestion_jobs')
@Index('idx_ingestion_document_status', ['documentId', 'status'])
export class IngestionJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => Document, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ name: 'triggered_by', type: 'uuid', nullable: true })
  triggeredById: string | null;

  @ManyToOne(() => User, (user) => user.ingestionJobs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'triggered_by' })
  triggeredBy: User | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: IngestionStatus.QUEUED,
  })
  status: IngestionStatus;

  @Column({ type: 'integer', default: 0 })
  attempts: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({
    name: 'started_at',
    type: 'timestamp',
    nullable: true,
  })
  startedAt: Date | null;

  @Column({
    name: 'completed_at',
    type: 'timestamp',
    nullable: true,
  })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
