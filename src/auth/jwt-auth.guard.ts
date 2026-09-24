import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { SystemRole } from '../generated/prisma/enums.js';

export interface JwtPayload {
  sub: string; // 当前用户 id
  systemRole: SystemRole;
  iat?: number; // Token 签发时间
  exp?: number; // Token 过期时间
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  // context 可以理解为 NestJS 对“当前正在执行的请求”的包装对象
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), // 当前控制器方法，例如 login()
      context.getClass(), // 当前控制器类，例如 AuthController
    ]);
    if (isPublic) {
      return true;
    }
    // context 不仅能表示 HTTP 请求，还能表示 WebSocket、RPC 等调用，所以先切到 HTTP 上下文
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authorization = request.headers.authorization;
    const [type, token] = authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('请先登录');
    }

    try {
      request.user = await this.jwtService.verifyAsync<JwtPayload>(token);

      return true;
    } catch {
      throw new UnauthorizedException('登录状态已失效');
    }
  }
}
