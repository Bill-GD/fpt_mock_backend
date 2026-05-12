import { UserRoleEnum } from '@/common/enums/user-role.enum';

export type JwtUserPayload = {
  id: number;
  email: string;
  username: string;
  role: UserRoleEnum;
};
