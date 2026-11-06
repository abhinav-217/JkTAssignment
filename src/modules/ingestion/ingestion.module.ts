import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IngestionJob } from './entities/ingestion-job.entity';
import { IngestionRepository } from './ingestion.repository';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { PythonIngestionClient } from './clients/python-ingestion.client';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IngestionJob]),
    DocumentsModule, // provides DocumentsRepository via export
  ],
  providers: [IngestionRepository, IngestionService, PythonIngestionClient],
  controllers: [IngestionController],
  exports: [IngestionService],
})
export class IngestionModule {}
