import { SetMetadata } from '@nestjs/common';
import { UserRoleEnum } from '@/common/enums/user-role.enum';

export const ROLE_KEY = 'roles';
export const Role = (...roles: UserRoleEnum[]) => SetMetadata(ROLE_KEY, roles);
