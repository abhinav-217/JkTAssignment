import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { join, extname } from 'path';
import { existsSync, mkdirSync, unlinkSync, createWriteStream } from 'fs';
import { randomUUID } from 'crypto';

import { UserRole } from '../../common/enums/user-role.enum';
import { DocumentStatus } from '../../common/enums/document-status.enum';
import { Document } from './entities/document.entity';
import { DocumentsRepository, PaginatedDocuments } from './documents.repository';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly uploadDir = join(process.cwd(), 'uploads');

  constructor(private readonly documentsRepository: DocumentsRepository) {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Upload a document file and create a metadata record.
   * ADMINs / EDITORs may upload; VIEWERs cannot.
   */
  async upload(
    dto: CreateDocumentDto,
    file: Express.Multer.File,
    uploadedById: string,
  ): Promise<Document> {
    const ext = extname(file.originalname);
    const storageKey = `${randomUUID()}${ext}`;
    const destPath = join(this.uploadDir, storageKey);

    // Persist file to local disk (replace this provider with S3 for production)
    await this.writeFileToDisk(file.buffer, destPath);

    const doc = await this.documentsRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      originalFilename: file.originalname,
      storageKey,
      mimeType: file.mimetype,
      fileSize: String(file.size),
      status: DocumentStatus.PENDING,
      uploadedById,
    });

    this.logger.log(`Document uploaded: ${doc.id} by user ${uploadedById}`);
    return doc;
  }

  /**
   * List documents.
   * - ADMIN / EDITOR: see all documents (paginated + filtered).
   * - VIEWER: sees only their own uploads.
   */
  async findPaginated(
    query: QueryDocumentsDto,
    requesterId: string,
    requesterRole: string,
  ): Promise<PaginatedDocuments> {
    const scopedToUser =
      requesterRole === UserRole.VIEWER ? requesterId : undefined;
    return this.documentsRepository.findPaginated(query, scopedToUser);
  }

  async findById(id: string, requesterId: string, requesterRole: string): Promise<Document> {
    const doc = await this.documentsRepository.findByIdOrFail(id);
    this.assertAccess(doc, requesterId, requesterRole);
    return doc;
  }

  async update(
    id: string,
    dto: UpdateDocumentDto,
    requesterId: string,
    requesterRole: string,
  ): Promise<Document> {
    const doc = await this.documentsRepository.findByIdOrFail(id);
    this.assertAccess(doc, requesterId, requesterRole);

    return this.documentsRepository.update(id, {
      ...(dto.title && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.status && { status: dto.status }),
    });
  }

  async remove(
    id: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<void> {
    const doc = await this.documentsRepository.findByIdOrFail(id);
    this.assertAccess(doc, requesterId, requesterRole);

    // Remove physical file
    const filePath = join(this.uploadDir, doc.storageKey);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }

    await this.documentsRepository.delete(id);
    this.logger.log(`Document deleted: ${id} by user ${requesterId}`);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Ownership check: ADMIN can access any doc; EDITOR/VIEWER only their own.
   */
  private assertAccess(
    doc: Document,
    requesterId: string,
    requesterRole: string,
  ): void {
    if (
      requesterRole !== UserRole.ADMIN &&
      doc.uploadedById !== requesterId
    ) {
      throw new ForbiddenException('You do not have access to this document');
    }
  }

  private writeFileToDisk(buffer: Buffer, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = createWriteStream(path);
      ws.write(buffer, (err) => {
        if (err) return reject(err);
        ws.end(resolve);
      });
      ws.on('error', reject);
    });
  }
}
