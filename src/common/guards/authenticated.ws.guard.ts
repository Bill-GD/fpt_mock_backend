import { JwtUserPayload } from '@/common/utils/types';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

function parseJwtFromCookie(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/(?:^|;\s*)jwt=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

@Injectable()
export class WsAuthenticatedGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.startsWith('Bearer ')) {
      return authToken.split(' ')[1];
    }
    return parseJwtFromCookie(client.handshake.headers.cookie);
  }

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('Authorization token is not provided.');
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      client.data.user = this.jwt.verify<JwtUserPayload>(token);
    } catch (err) {
      if (err instanceof Error) {
        throw new WsException(err.message);
      }
    }
    return true;
  }
}
