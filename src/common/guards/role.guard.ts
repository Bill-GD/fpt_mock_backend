import { ROLE_KEY } from '@/common/decorators';
import { UserRoleEnum } from '@/common/enums/user-role.enum';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRoleEnum[]>(
      ROLE_KEY,
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.authUser;
    const userRoleLower = user?.role?.toLowerCase();
    const requiredRolesLower = requiredRoles.map((r) => r.toLowerCase());

    if (!user || !requiredRolesLower.includes(userRoleLower ?? '')) {
      throw new ForbiddenException(
        `Only ${requiredRoles.join(' or ')} can access this resource`,
      );
    }

    return true;
  }
}
