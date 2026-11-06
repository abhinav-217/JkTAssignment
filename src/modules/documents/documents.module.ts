import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';

import { Document } from './entities/document.entity';
import { DocumentsRepository } from './documents.repository';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    MulterModule.register({ dest: './uploads' }),
  ],
  providers: [DocumentsRepository, DocumentsService],
  controllers: [DocumentsController],
  exports: [DocumentsService, DocumentsRepository], // ← export Repository so IngestionModule can use it
})
export class DocumentsModule {}
