import { ViolationType } from '@/common/enums/violation-type.enum';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

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
