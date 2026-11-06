import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

import { UserRole } from '../../common/enums/user-role.enum';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { UsersRepository, PaginatedUsers } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QueryUsersDto } from './dto/query-users.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly dataSource: DataSource,
  ) { }

  // ─── Admin: List ──────────────────────────────────────────────────────────

  async findPaginated(query: QueryUsersDto): Promise<PaginatedUsers> {
    return this.usersRepository.findPaginated(query);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  // ─── Admin: Get one ───────────────────────────────────────────────────────

  async findById(id: string): Promise<User> {
    return this.usersRepository.findByIdOrFail(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email, true);
  }

  // ─── Admin: Create ────────────────────────────────────────────────────────

  async create(dto: CreateUserDto): Promise<User> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const existing = await this.usersRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException(`Email "${normalizedEmail}" is already registered`);
    }

    const roleId = await this.resolveRoleId(dto.role ?? UserRole.VIEWER);
    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = await this.usersRepository.create({
      name: dto.name,
      email: normalizedEmail,
      passwordHash: hashedPassword,
      roleId,
      isActive: true,
    });

    this.logger.log(`Admin created user: ${user.id} (${user.email})`);
    return user;
  }

  // ─── Admin: Update basic fields ───────────────────────────────────────────

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    await this.usersRepository.findByIdOrFail(id);

    const updatePayload: Partial<User> = {};

    if (dto.name) {
      updatePayload.name = dto.name;
    }

    if (dto.email) {
      const normalizedEmail = dto.email.toLowerCase().trim();
      const existing = await this.usersRepository.findByEmail(normalizedEmail);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Email "${normalizedEmail}" is already in use`);
      }
      updatePayload.email = normalizedEmail;
    }

    const updated = await this.usersRepository.update(id, updatePayload);
    this.logger.log(`User updated: ${id}`);
    return updated;
  }

  // ─── Admin: Change role ───────────────────────────────────────────────────

  async updateRole(id: string, dto: UpdateRoleDto, actorId: string): Promise<User> {
    const user = await this.usersRepository.findByIdOrFail(id);
    const currentRoleName = user.role?.name;

    if (currentRoleName === dto.role) {
      throw new BadRequestException(`User already has role "${dto.role}"`);
    }

    // Guard: prevent demoting the last active ADMIN
    if (currentRoleName === UserRole.ADMIN && dto.role !== UserRole.ADMIN) {
      const adminCount = await this.usersRepository.countActiveAdmins();
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot demote the last active administrator',
        );
      }
    }

    const newRoleId = await this.resolveRoleId(dto.role);
    const updated = await this.usersRepository.update(id, { roleId: newRoleId });

    this.logger.log(
      `Role changed: user=${id} from=${currentRoleName} to=${dto.role} by=${actorId}`,
    );
    return updated;
  }

  // ─── Admin: Activate / Deactivate ─────────────────────────────────────────

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    actorId: string,
  ): Promise<User> {
    const user = await this.usersRepository.findByIdOrFail(id);

    if (user.isActive === dto.isActive) {
      throw new BadRequestException(
        `User is already ${dto.isActive ? 'active' : 'inactive'}`,
      );
    }

    // Guard: prevent deactivating the last active ADMIN
    if (!dto.isActive && user.role?.name === UserRole.ADMIN) {
      const adminCount = await this.usersRepository.countActiveAdmins();
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot deactivate the last active administrator',
        );
      }
    }

    const updated = await this.usersRepository.update(id, {
      isActive: dto.isActive,
    });

    // Revoke all refresh tokens on deactivation (best-effort — do not fail
    // the status update if token revocation itself hits a DB error)
    if (!dto.isActive) {
      try {
        await this.dataSource
          .getRepository('refresh_tokens')
          .createQueryBuilder()
          .update()
          .set({ revokedAt: new Date() })
          .where('user_id = :id AND revoked_at IS NULL', { id })
          .execute();
      } catch (err: unknown) {
        this.logger.error(
          `Failed to revoke refresh tokens for user ${id}: ${String(err)}`,
        );
      }
    }

    this.logger.log(
      `Status changed: user=${id} isActive=${dto.isActive} by=${actorId}`,
    );
    return updated;
  }

  // ─── Admin: Soft-delete ───────────────────────────────────────────────────

  async remove(id: string, actorId: string): Promise<void> {
    const user = await this.usersRepository.findByIdOrFail(id);

    if (id === actorId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    if (user.role?.name === UserRole.ADMIN) {
      const adminCount = await this.usersRepository.countActiveAdmins();
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot delete the last active administrator',
        );
      }
    }

    await this.usersRepository.softDelete(id);
    this.logger.log(`User soft-deleted: ${id} by=${actorId}`);
  }

  // ─── Authenticated user: update own profile ───────────────────────────────

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    await this.usersRepository.findByIdOrFail(id);

    const updatePayload: Partial<User> = {};
    if (dto.name) updatePayload.name = dto.name;

    const updated = await this.usersRepository.update(id, updatePayload);
    this.logger.log(`Profile updated: ${id}`);
    return updated;
  }

  // ─── Shared helpers ───────────────────────────────────────────────────────

  async validatePassword(plainText: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plainText, hashed);
  }

  private async resolveRoleId(roleName: UserRole): Promise<string> {
    const roleRepo = this.dataSource.getRepository(Role);
    const found = await roleRepo.findOne({ where: { name: roleName } });
    if (!found) {
      throw new NotFoundException(`Role "${roleName}" not found in database`);
    }
    return found.id;
  }
}
