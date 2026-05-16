import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Question } from '../entities/question.entity';

export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber({ allowNaN: false })
  @IsNotEmpty()
  @Min(1)
  durationMinutes: number;

  @IsArray()
  @IsOptional()
  questions?: Question[];
}
