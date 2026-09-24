import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import * as argon2 from 'argon2';

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

    const expiresIn = (this.configService.get<string>('JWT_EXPIRES_IN') ??
      '1h') as JwtSignOptions['expiresIn'];

    const token = await this.jwtService.signAsync(
      {
        sub: user.id,
        systemRole: user.systemRole,
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
      },
    };
  }
}
