import { IsNotEmpty, IsOptional, IsString, NotContains } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @NotContains(' ', {
    message: () => 'username must not contain spaces.',
  })
  username?: string;
}
