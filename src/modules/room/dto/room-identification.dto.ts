import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class RoomIdentificationDto {
  @IsNumber()
  @IsPositive()
  @IsOptional()
  id?: number;

  @IsString()
  @IsOptional()
  code?: string;
}
