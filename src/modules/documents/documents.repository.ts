import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Document } from './entities/document.entity';
import { DocumentStatus } from '../../common/enums/document-status.enum';
import { QueryDocumentsDto } from './dto/query-documents.dto';

export interface PaginatedDocuments {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class DocumentsRepository {
  constructor(
    @InjectRepository(Document)
    private readonly repo: Repository<Document>,
  ) {}

  async create(data: Partial<Document>): Promise<Document> {
    const doc = this.repo.create(data);
    return this.repo.save(doc);
  }

  async findPaginated(
    query: QueryDocumentsDto,
    uploadedById?: string,
  ): Promise<PaginatedDocuments> {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.uploadedBy', 'user')
      .orderBy('doc.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (uploadedById) {
      qb.andWhere('doc.uploadedById = :uploadedById', { uploadedById });
    }

    if (search) {
      qb.andWhere('LOWER(doc.title) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    if (status) {
      qb.andWhere('doc.status = :status', { status });
    }

    const [documents, total] = await qb.getManyAndCount();

    return {
      documents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<Document | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['uploadedBy'],
    });
  }

  async findByIdOrFail(id: string): Promise<Document> {
    const doc = await this.findById(id);
    if (!doc) throw new NotFoundException(`Document with id "${id}" not found`);
    return doc;
  }

  async update(id: string, partial: Partial<Document>): Promise<Document> {
    await this.repo.update(id, partial);
    return this.findByIdOrFail(id);
  }

  async updateStatus(id: string, status: DocumentStatus): Promise<void> {
    await this.repo.update(id, { status });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async countByUploader(uploadedById: string): Promise<number> {
    return this.repo.count({ where: { uploadedById } });
  }
}
