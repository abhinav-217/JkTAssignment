import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { IngestionStatus } from '../../common/enums/ingestion-status.enum';
import { DocumentsRepository } from '../documents/documents.repository';
import { IngestionJob } from './entities/ingestion-job.entity';
import { IngestionRepository, PaginatedIngestionJobs } from './ingestion.repository';
import { PythonIngestionClient } from './clients/python-ingestion.client';
import { TriggerIngestionDto } from './dto/trigger-ingestion.dto';
import { QueryIngestionDto } from './dto/query-ingestion.dto';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly ingestionRepository: IngestionRepository,
    private readonly documentsRepository: DocumentsRepository,
    private readonly pythonClient: PythonIngestionClient,
  ) {}

  /**
   * Trigger ingestion for a document.
   * Creates a QUEUED job, fires async request to Python service (202 pattern).
   */
  async trigger(dto: TriggerIngestionDto, triggeredById: string): Promise<IngestionJob> {
    // Validate document exists
    const document = await this.documentsRepository.findByIdOrFail(dto.documentId);

    // Create job in QUEUED state
    const job = await this.ingestionRepository.create({
      documentId: dto.documentId,
      triggeredById,
      status: IngestionStatus.QUEUED,
      attempts: 0,
    });

    this.logger.log(`Ingestion job created: ${job.id} for document: ${dto.documentId}`);

    // Fire-and-forget: call Python service asynchronously
    this.dispatchToService(job.id, document.storageKey, document.mimeType).catch(
      (err: unknown) => {
        this.logger.error(`Dispatch failed for job ${job.id}: ${String(err)}`);
      },
    );

    return job;
  }

  /**
   * List all ingestion jobs with pagination and filters.
   */
  async findPaginated(query: QueryIngestionDto): Promise<PaginatedIngestionJobs> {
    return this.ingestionRepository.findPaginated(query);
  }

  /**
   * Get a single ingestion job by ID.
   */
  async findById(id: string): Promise<IngestionJob> {
    return this.ingestionRepository.findByIdOrFail(id);
  }

  /**
   * Cancel a QUEUED job. Already running/completed jobs cannot be cancelled.
   */
  async cancel(id: string): Promise<IngestionJob> {
    const job = await this.ingestionRepository.findByIdOrFail(id);

    if (job.status !== IngestionStatus.QUEUED) {
      throw new Error(
        `Cannot cancel job in status "${job.status}". Only QUEUED jobs can be cancelled.`,
      );
    }

    await this.ingestionRepository.updateStatus(id, IngestionStatus.CANCELLED);
    return this.ingestionRepository.findByIdOrFail(id);
  }

  /**
   * Webhook / callback handler: Python service reports final status.
   * Call this from an internal endpoint (not publicly exposed).
   */
  async handleStatusUpdate(
    jobId: string,
    status: IngestionStatus,
    errorMessage?: string,
  ): Promise<void> {
    const job = await this.ingestionRepository.findByIdOrFail(jobId);

    const extras: Parameters<IngestionRepository['updateStatus']>[2] = {};

    if (status === IngestionStatus.PROCESSING) {
      extras.startedAt = new Date();
    } else if (
      status === IngestionStatus.COMPLETED ||
      status === IngestionStatus.FAILED
    ) {
      extras.completedAt = new Date();
      if (errorMessage) extras.errorMessage = errorMessage;
    }

    await this.ingestionRepository.updateStatus(jobId, status, extras);
    this.logger.log(`Job ${jobId} status updated: ${job.status} → ${status}`);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async dispatchToService(
    jobId: string,
    storageKey: string,
    mimeType: string,
  ): Promise<void> {
    // Mark as PROCESSING
    await this.ingestionRepository.updateStatus(jobId, IngestionStatus.PROCESSING, {
      startedAt: new Date(),
    });
    await this.ingestionRepository.incrementAttempts(jobId);

    const response = await this.pythonClient.triggerIngestion({
      jobId,
      documentId: jobId, // Python service correlates by jobId
      storageKey,
      mimeType,
    });

    if (!response.accepted) {
      await this.ingestionRepository.updateStatus(jobId, IngestionStatus.FAILED, {
        completedAt: new Date(),
        errorMessage: response.message ?? 'Python service rejected the request',
      });
      this.logger.warn(`Ingestion rejected: job=${jobId}`);
    }
    // On success: Python service will call back via webhook to update COMPLETED/FAILED
  }
}
