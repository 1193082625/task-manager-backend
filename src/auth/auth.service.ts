import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import * as argon2 from 'argon2';
import { ChangePasswordDto } from './dto/change-password.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        systemRole: true,
        isActive: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('登录用户不存在');
    }
    return user;
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: {
        phone: dto.phone,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        systemRole: true,
        passwordHash: true,
        isActive: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    const passwordMatches = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('账号已停用，请联系管理员');
    }

    const expiresIn = (this.configService.get<string>('JWT_EXPIRES_IN') ??
      '1h') as JwtSignOptions['expiresIn'];

    const token = await this.jwtService.signAsync(
      {
        sub: user.id,
        systemRole: user.systemRole,
        tokenVersion: user.tokenVersion,
      },
      {
        expiresIn,
      },
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        systemRole: user.systemRole,
        isActive: user.isActive,
      },
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        passwordHash: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('登录用户不存在');
    }

    const currentPasswordMatches = await argon2.verify(
      user.passwordHash,
      dto.currentPassword,
    );

    if (!currentPasswordMatches) {
      throw new BadRequestException('当前密码错误');
    }

    const isSamePassword = await argon2.verify(
      user.passwordHash,
      dto.newPassword,
    );

    if (isSamePassword) {
      throw new BadRequestException('新密码不能与当前密码相同');
    }

    const passwordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
    });

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash,
        tokenVersion: {
          increment: 1,
        },
      },
    });
  }
}
