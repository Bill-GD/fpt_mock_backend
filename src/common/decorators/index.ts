import { UserRoleEnum } from '@/common/enums/user-role.enum';
import { JwtUserPayload } from '@/common/utils/types';
import {
  BadRequestException,
  createParamDecorator,
  SetMetadata,
} from '@nestjs/common';
import { Request } from 'express';
import { Socket } from 'socket.io';

export const RequesterID = createParamDecorator((_data, context) => {
  const req = context.switchToHttp().getRequest<Request>();
  if (!req.authUser) {
    throw new BadRequestException('No authenticated user found');
  }
  return req.authUser.id;
});

export const WsRequester = createParamDecorator((data, context) => {
  const client = context.switchToWs().getClient<Socket>();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (!client.data.user) {
    throw new BadRequestException('No user ID found in WS event');
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return client.data.user as JwtUserPayload;
});

export const ROLE_KEY = 'roles';
export const Role = (...roles: UserRoleEnum[]) => SetMetadata(ROLE_KEY, roles);
