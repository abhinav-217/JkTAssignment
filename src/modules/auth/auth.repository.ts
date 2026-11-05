import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';

import { RefreshToken } from '../users/entities/refresh-token.entity';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
    const refreshToken = this.refreshTokenRepo.create({
      userId,
      tokenHash: this.hashToken(token),
      expiresAt,
      revokedAt: null,
    });

    return this.refreshTokenRepo.save(refreshToken);
  }

  async findValidRefreshToken(token: string): Promise<RefreshToken | null> {
    const tokenHash = this.hashToken(token);

    const refreshToken = await this.refreshTokenRepo.findOne({
      where: {
        tokenHash,
      },
      relations: ['user'],
    });

    if (!refreshToken || refreshToken.revokedAt) {
      return null;
    }

    return refreshToken;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    await this.refreshTokenRepo.update(
      { tokenHash },
      { revokedAt: new Date() },
    );
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepo
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  async revokeById(id: string): Promise<void> {
    await this.refreshTokenRepo.update(id, { revokedAt: new Date() });
  }
}
