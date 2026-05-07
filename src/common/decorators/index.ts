import { BadRequestException, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';

export const RequesterID = createParamDecorator((_data, context) => {
  const req = context.switchToHttp().getRequest<Request>();
  if (!req.authUser) {
    throw new BadRequestException('No authenticated user found');
  }
  return req.authUser.id;
});
