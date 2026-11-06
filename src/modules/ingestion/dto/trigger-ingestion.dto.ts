import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class TriggerIngestionDto {
  @ApiProperty({
    example: 'uuid-v4',
    description: 'ID of the document to ingest',
  })
  @IsUUID()
  @IsNotEmpty()
  documentId: string;
}
