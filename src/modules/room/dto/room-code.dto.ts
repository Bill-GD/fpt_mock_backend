import {
  IsNumber,
  IsPositive,
  IsString,
  Length,
  IsOptional,
} from 'class-validator';

export class RoomIdentificationDto {
  @IsNumber()
  @IsPositive()
  id: number;

  @IsString()
  @Length(6, 8)
  @IsOptional()
  code?: string;
}
