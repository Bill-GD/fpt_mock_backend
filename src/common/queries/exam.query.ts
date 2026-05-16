import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { CommonQuery } from './common.query';

export class ExamQuery extends CommonQuery {
  @IsInt()
  @IsOptional()
  teacherId?: number;

  @IsString()
  @IsOptional()
  title?: string;

  @IsBoolean()
  @IsOptional()
  hasActiveRoom?: boolean;
}
