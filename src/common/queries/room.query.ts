import { RoomStatusEnum } from '@/common/enums/room-status.enum';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { CommonQuery } from './common.query';

export class RoomQuery extends CommonQuery {
  @IsInt()
  @IsOptional()
  examId?: number;

  @IsEnum(RoomStatusEnum)
  @IsOptional()
  status?: RoomStatusEnum;

  @IsString()
  @IsOptional()
  code?: string;
}
