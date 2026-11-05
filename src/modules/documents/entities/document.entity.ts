import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { DocumentStatus } from '../../../common/enums/document-status.enum';
import { User } from '../../users/entities/user.entity';

@Entity('documents')
@Index('idx_documents_uploaded_by', ['uploadedById'])
@Index('idx_documents_status', ['status'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'original_filename',
    type: 'varchar',
    length: 255,
  })
  originalFilename: string;

  @Column({
    name: 'storage_key',
    type: 'varchar',
    length: 500,
    unique: true,
  })
  storageKey: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: DocumentStatus.PENDING,
  })
  status: DocumentStatus;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedById: string;

  @ManyToOne(() => User, (user) => user.documents, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
