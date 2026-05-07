import { UserRoleEnum } from '@/modules/auth/dto/register.dto';

export type JwtUserPayload = {
  id: number;
  email: string;
  username: string;
  role: UserRoleEnum;
};
