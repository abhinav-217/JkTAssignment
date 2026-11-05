import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';

import { User } from './entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async create(dto: Partial<User>): Promise<User> {
    const user = this.repo.create(dto);
    return this.repo.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.repo.find({
      order: { createdAt: 'DESC' },
      relations: ['role'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['role'],
    });
  }

  async findByEmail(email: string, withPassword = false): Promise<User | null> {
    const qb = this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.email = :email', { email });

    if (withPassword) {
      qb.addSelect('user.password_hash');
    }

    return qb.getOne();
  }

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException(`User with id "${id}" not found`);
    return user;
  }

  async update(id: string, partial: Partial<User>): Promise<User> {
    await this.repo.update(id, partial);
    return this.findByIdOrFail(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.findByIdOrFail(id);
    await this.repo.update(id, { isActive: false });
  }

  async hardDelete(id: string): Promise<void> {
    await this.findByIdOrFail(id);
    await this.repo.delete(id);
  }

  async count(where?: FindOptionsWhere<User>): Promise<number> {
    return this.repo.count({ where });
  }
}
