import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

import { UserRole } from '../../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existing = await this.usersService.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const user = await this.usersService.create({
      name: dto.name.trim(),
      email: normalizedEmail,
      password: dto.password,
      role: UserRole.VIEWER,
    });

    return {
      success: true,
      message: 'User registered successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: UserRole.VIEWER,
      },
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const roleName = user.role?.name ?? UserRole.VIEWER;
    const accessToken = this.signAccessToken(user, roleName);
    const refreshToken = this.generateRefreshToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.authRepository.saveRefreshToken(user.id, refreshToken, expiresAt);

    return {
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: roleName,
        },
      },
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const existingToken = await this.authRepository.findValidRefreshToken(dto.refreshToken);

    if (!existingToken || !existingToken.user || !existingToken.user.isActive) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (new Date(existingToken.expiresAt) < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const oldHash = this.authRepository.hashToken(dto.refreshToken);
      await queryRunner.manager.getRepository('refresh_tokens').update(
        { tokenHash: oldHash },
        { revokedAt: new Date() },
      );

      const newAccessToken = this.signAccessToken(existingToken.user, existingToken.user.role?.name ?? UserRole.VIEWER);
      const newRefreshToken = this.generateRefreshToken();
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await queryRunner.manager.getRepository('refresh_tokens').insert({
        userId: existingToken.user.id,
        tokenHash: this.authRepository.hashToken(newRefreshToken),
        expiresAt: newExpiresAt,
        revokedAt: null,
      });

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: 15 * 60,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async logout(dto: RefreshTokenDto) {
    await this.authRepository.revokeRefreshToken(dto.refreshToken);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async getMe(user: { id: string; email: string; role: string }) {
    const currentUser = await this.usersService.findById(user.id);
    if (!currentUser || !currentUser.isActive) {
      throw new UnauthorizedException();
    }

    return {
      success: true,
      data: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role?.name ?? UserRole.VIEWER,
        isActive: Boolean(currentUser.isActive),
      },
    };
  }

  private signAccessToken(user: User, role: string) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role,
    };

    return this.jwtService.sign(payload, {
      expiresIn: '15m',
    });
  }

  private generateRefreshToken(): string {
    return Array.from({ length: 32 }, () => Math.random().toString(36).slice(2)).join('').slice(0, 64);
  }
}
