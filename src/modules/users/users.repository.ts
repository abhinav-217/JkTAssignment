import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { UserRole } from '../../common/enums/user-role.enum';
import { User } from './entities/user.entity';
import { QueryUsersDto } from './dto/query-users.dto';

export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  // ─── Write ────────────────────────────────────────────────────────────────

  async create(data: Partial<User>): Promise<User> {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async update(id: string, partial: Partial<User>): Promise<User> {
    await this.repo.update(id, partial);
    return this.findByIdOrFail(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.findByIdOrFail(id);
    await this.repo.update(id, { isActive: false });
  }

  // ─── Read ─────────────────────────────────────────────────────────────────

  async findPaginated(query: QueryUsersDto): Promise<PaginatedUsers> {
    const { page = 1, limit = 10, search, role, isActive } = query;
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      qb.andWhere(
        '(LOWER(user.name) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    if (role) {
      qb.andWhere('role.name = :role', { role });
    }

    if (isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive });
    }

    const [users, total] = await qb.getManyAndCount();

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAll(): Promise<User[]> {
    return this.repo.find({
      relations: ['role'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id }, relations: ['role'] });
  }

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException(`User with id "${id}" not found`);
    return user;
  }

  async findByEmail(email: string, withPassword = false): Promise<User | null> {
    const qb = this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.email = :email', { email });

    if (withPassword) {
      qb.addSelect('user.passwordHash');
    }

    return qb.getOne();
  }

  async countActiveAdmins(): Promise<number> {
    return this.repo
      .createQueryBuilder('user')
      .innerJoin('user.role', 'role')
      .where('role.name = :role', { role: UserRole.ADMIN })
      .andWhere('user.isActive = true')
      .getCount();
  }

  async count(): Promise<number> {
    return this.repo.count();
  }
}
