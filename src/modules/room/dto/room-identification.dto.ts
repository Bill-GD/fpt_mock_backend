import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
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
