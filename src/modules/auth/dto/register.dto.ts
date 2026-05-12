import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  NotContains,
} from 'class-validator';
import { UserRoleEnum } from '@/common/enums/user-role.enum';

export class RegisterDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @NotContains(' ', {
    message: () => 'username must not contain spaces.',
  })
  username: string;

  @IsNotEmpty()
  @IsString()
  @Length(8, 20, {
    message: () => 'Password must be within 8 and 20 characters.',
  })
  password: string;

  @IsNotEmpty()
  @IsEnum(UserRoleEnum)
  role: UserRoleEnum;
}
