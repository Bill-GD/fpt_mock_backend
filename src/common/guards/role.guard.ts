import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_KEY } from '@/common/decorators/role.decorator';
import { UserRoleEnum } from '@/common/enums/user-role.enum';
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

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Only ${requiredRoles.join(' or ')} can access this resource`,
      );
    }

    return true;
  }
}
