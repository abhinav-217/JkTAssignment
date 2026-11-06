import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UserResponseDto } from './dto/user-response.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── ADMIN endpoints ──────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all users with pagination and filters (ADMIN)' })
  @ApiOkResponse({ description: 'Paginated list of users' })
  async findAll(@Query() query: QueryUsersDto) {
    const result = await this.usersService.findPaginated(query);
    return {
      success: true,
      data: {
        users: result.users,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
    };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a user (ADMIN)' })
  @ApiCreatedResponse({ description: 'User created successfully' })
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return {
      success: true,
      message: 'User created successfully',
      data: user,
    };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get own profile (Authenticated)' })
  @ApiOkResponse({ type: UserResponseDto })
  async getMe(@Request() req: { user: { id: string; email: string; role: string } }) {
    const user = await this.usersService.findById(req.user.id);
    return { success: true, data: user };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile (Authenticated)' })
  @ApiOkResponse({ type: UserResponseDto })
  async updateProfile(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.usersService.updateProfile(req.user.id, dto);
    return { success: true, data: updated };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a user by ID (ADMIN)' })
  @ApiOkResponse({ type: UserResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findById(id);
    return { success: true, data: user };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user name/email (ADMIN)' })
  @ApiOkResponse({ type: UserResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const updated = await this.usersService.update(id, dto);
    return { success: true, data: updated };
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Change user role (ADMIN)' })
  @ApiOkResponse({ type: UserResponseDto })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @Request() req: { user: { id: string } },
  ) {
    const updated = await this.usersService.updateRole(id, dto, req.user.id);
    return { success: true, data: updated };
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activate or deactivate a user (ADMIN)' })
  @ApiOkResponse({ type: UserResponseDto })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @Request() req: { user: { id: string } },
  ) {
    const updated = await this.usersService.updateStatus(id, dto, req.user.id);
    return { success: true, data: updated };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a user (ADMIN)' })
  @ApiNoContentResponse()
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { id: string } },
  ): Promise<void> {
    return this.usersService.remove(id, req.user.id);
  }
}
