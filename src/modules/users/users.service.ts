import {
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { UserRole } from '../../common/enums/user-role.enum';
import { User } from './entities/user.entity';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(`Email "${dto.email}" is already registered`);
    }

    const roleId = await this.resolveRoleId(dto.role ?? UserRole.VIEWER);
    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = await this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash: hashedPassword,
      roleId,
      isActive: true,
    });

    this.logger.log(`User created: ${user.id}`);
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  async findById(id: string): Promise<User> {
    return this.usersRepository.findByIdOrFail(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email, true);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const updatePayload: Partial<User> = { ...dto, role: undefined };

    if (dto.role) {
      updatePayload.roleId = await this.resolveRoleId(dto.role);
    }

    delete (updatePayload as Partial<Record<string, unknown>>).role;
    delete (updatePayload as Partial<Record<string, unknown>>).name;
    if (dto.name) {
      updatePayload.name = dto.name;
    }

    const updated = await this.usersRepository.update(id, updatePayload);
    this.logger.log(`User updated: ${id}`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.softDelete(id);
    this.logger.log(`User soft-deleted: ${id}`);
  }

  async validatePassword(plainText: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plainText, hashed);
  }

  private async resolveRoleId(role: UserRole): Promise<string> {
    const roleRepo = this.usersRepository['repo'];
    const found = await roleRepo.manager
      .getRepository('roles')
      .findOne({ where: { name: role } });

    if (!found) {
      throw new ConflictException(`Role "${role}" does not exist`);
    }

    return found.id;
  }
}
