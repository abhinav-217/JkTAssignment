import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

import { IngestionStatus } from '../../../common/enums/ingestion-status.enum';

export class QueryIngestionDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: IngestionStatus })
  @IsOptional()
  @IsEnum(IngestionStatus)
  status?: IngestionStatus;

  @ApiPropertyOptional({ description: 'Filter by document ID' })
  @IsOptional()
  @IsUUID()
  documentId?: string;
}
