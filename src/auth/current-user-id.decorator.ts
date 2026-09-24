import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from './jwt-auth.guard.js';

export const CurrentUserId: () => ParameterDecorator = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.user.sub;
  },
);
