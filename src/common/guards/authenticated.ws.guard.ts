import { JwtUserPayload } from '@/common/utils/types';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsAuthenticatedGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();

    if (
      !client.handshake.auth?.token ||
      typeof client.handshake.auth?.token !== 'string'
    ) {
      throw new WsException('Authorization token is not provided.');
    }
    if (!client.handshake.auth.token.startsWith('Bearer')) {
      throw new WsException('User is not authenticated.');
    }

    const authToken = client.handshake.auth.token.split(' ')[1];

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      client.data.user = this.jwt.verify<JwtUserPayload>(authToken);
    } catch (err) {
      if (err instanceof Error) {
        throw new WsException(err.message);
      }
    }
    return true;
  }
}
