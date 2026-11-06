import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({ example: 'Q4 Finance Report', description: 'Document title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Contains quarterly results', description: 'Optional description' })
  @IsOptional()
  @IsString()
  description?: string;
}
