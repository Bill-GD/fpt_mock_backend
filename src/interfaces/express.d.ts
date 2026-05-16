import 'express';
import { JwtUserPayload } from '@/common/utils/types';

declare module 'express' {
  interface Request {
    authUser?: JwtUserPayload;
  }
}
