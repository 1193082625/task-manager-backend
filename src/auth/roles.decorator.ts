import { CustomDecorator, SetMetadata } from '@nestjs/common';
import type { SystemRole } from '../generated/prisma/enums.js';

export const ROLES_KEY = 'systemRoles';

export const Roles = (...roles: SystemRole[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
