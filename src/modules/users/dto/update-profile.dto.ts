import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Fields that the authenticated user may update on their own profile.
 * Role, isActive, id and passwordHash are intentionally excluded.
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Abhinav Kumar',
    description: 'Display name of the user',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
