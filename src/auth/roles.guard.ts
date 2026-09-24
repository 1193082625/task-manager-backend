import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SystemRole } from '../generated/prisma/enums.js';
import { ROLES_KEY } from './roles.decorator.js';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireRoles = this.reflector.getAllAndOverride<SystemRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 没有使用 @Roles() 的接口不额外限制
    if (!requireRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!requireRoles.includes(request.user.systemRole)) {
      throw new ForbiddenException('你没有执行该操作的权限');
    }

    return true;
  }
}
