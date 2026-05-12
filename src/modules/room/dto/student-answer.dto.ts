import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class StudentAnswerDto {
  @IsNumber()
  @IsPositive()
  roomId: number;

  @IsNumber()
  @IsPositive()
  examId: number;

  @IsNumber()
  @IsPositive()
  questionId: number;

  @IsNumber()
  @IsOptional()
  optionId?: number;
}
