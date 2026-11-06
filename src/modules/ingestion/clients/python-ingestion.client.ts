import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IngestionRequest {
  jobId: string;
  documentId: string;
  storageKey: string;
  mimeType: string;
}

export interface IngestionResponse {
  jobId: string;
  accepted: boolean;
  message?: string;
}

/**
 * Adapter pattern — isolates HTTP communication with the Python ingestion
 * service. Swap the implementation (e.g. gRPC, message queue) without
 * touching IngestionService.
 */
@Injectable()
export class PythonIngestionClient {
  private readonly logger = new Logger(PythonIngestionClient.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = configService.get<string>('PYTHON_SERVICE_URL') ?? 'http://localhost:8000';
  }

  async triggerIngestion(request: IngestionRequest): Promise<IngestionResponse> {
    const url = `${this.baseUrl}/api/ingest`;

    this.logger.log(`Triggering ingestion: job=${request.jobId} doc=${request.documentId}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.warn(`Python service returned ${response.status}: ${text}`);
        return { jobId: request.jobId, accepted: false, message: text };
      }

      const data = (await response.json()) as IngestionResponse;
      this.logger.log(`Ingestion accepted: job=${request.jobId}`);
      return data;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Python service unreachable: ${msg}`);
      return { jobId: request.jobId, accepted: false, message: msg };
    }
  }

  async getJobStatus(jobId: string): Promise<{ status: string; message?: string }> {
    const url = `${this.baseUrl}/api/ingest/${jobId}/status`;

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5_000),
      });

      if (!response.ok) {
        return { status: 'UNKNOWN', message: `HTTP ${response.status}` };
      }

      return response.json() as Promise<{ status: string; message?: string }>;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return { status: 'UNKNOWN', message: msg };
    }
  }
}
