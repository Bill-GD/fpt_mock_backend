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
  @IsOptional()
  attemptId?: number;

  // Frontend sends "type" field (maps to violationType)
  @IsString()
  @IsOptional()
  type?: string;

  // Frontend sends "description" (maps to evidenceUrl/description)
  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ViolationType)
  @IsOptional()
  violationType?: ViolationType;

  @IsString()
  @IsOptional()
  evidenceUrl?: string;
}
