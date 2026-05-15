import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class StudentAnswerDto {
  @IsNumber()
  @IsPositive()
  roomId: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  examId?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  questionId?: number;

  @IsNumber()
  @IsOptional()
  optionId?: number;
}
