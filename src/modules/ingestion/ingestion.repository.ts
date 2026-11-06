import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IngestionJob } from './entities/ingestion-job.entity';
import { IngestionStatus } from '../../common/enums/ingestion-status.enum';
import { QueryIngestionDto } from './dto/query-ingestion.dto';

export interface PaginatedIngestionJobs {
  jobs: IngestionJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class IngestionRepository {
  constructor(
    @InjectRepository(IngestionJob)
    private readonly repo: Repository<IngestionJob>,
  ) {}

  async create(data: Partial<IngestionJob>): Promise<IngestionJob> {
    const job = this.repo.create(data);
    return this.repo.save(job);
  }

  async findPaginated(query: QueryIngestionDto): Promise<PaginatedIngestionJobs> {
    const { page = 1, limit = 10, status, documentId } = query;
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.document', 'document')
      .leftJoinAndSelect('job.triggeredBy', 'user')
      .orderBy('job.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      qb.andWhere('job.status = :status', { status });
    }

    if (documentId) {
      qb.andWhere('job.documentId = :documentId', { documentId });
    }

    const [jobs, total] = await qb.getManyAndCount();
    return { jobs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<IngestionJob | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['document', 'triggeredBy'],
    });
  }

  async findByIdOrFail(id: string): Promise<IngestionJob> {
    const job = await this.findById(id);
    if (!job) throw new NotFoundException(`Ingestion job "${id}" not found`);
    return job;
  }

  async updateStatus(
    id: string,
    status: IngestionStatus,
    extras?: Partial<Pick<IngestionJob, 'startedAt' | 'completedAt' | 'errorMessage' | 'attempts'>>,
  ): Promise<void> {
    await this.repo.update(id, { status, ...extras });
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.repo.increment({ id }, 'attempts', 1);
  }
}
