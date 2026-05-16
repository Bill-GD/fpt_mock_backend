import { JwtUserPayload } from '@/common/utils/types';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JsonWebTokenError, JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    // token is stored in an httpOnly cookie named 'jwt'
    const token = req.cookies?.jwt as string | undefined;
    if (!token) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    try {
      req.authUser = this.jwtService.verify<JwtUserPayload>(token);
      return true;
    } catch (err) {
      throw err instanceof JsonWebTokenError
        ? new UnauthorizedException(err.message)
        : err;
    }
  }
}
