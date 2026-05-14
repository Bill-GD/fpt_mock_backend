import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
} from 'class-validator';
import { ViolationType } from '@/common/enums/violation-type.enum';

export class StudentViolationDto {
  @IsNumber()
  @IsPositive()
  roomId: number;

  @IsNumber()
  @IsPositive()
  attemptId: number;

  @IsEnum(ViolationType)
  violationType: ViolationType;

  @IsString()
  @IsOptional()
  evidenceUrl?: string;
}
