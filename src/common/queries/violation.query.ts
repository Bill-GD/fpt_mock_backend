import { IsInt, IsPositive } from 'class-validator';
import { CommonQuery } from './common.query';

export class ViolationQuery extends CommonQuery {
  @IsInt()
  @IsPositive()
  attemptId: number;
}
