import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

import { UserRole } from '../../../common/enums/user-role.enum';

export class UpdateRoleDto {
  @ApiProperty({
    enum: UserRole,
    example: UserRole.EDITOR,
    description: 'New role to assign to the user',
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}
