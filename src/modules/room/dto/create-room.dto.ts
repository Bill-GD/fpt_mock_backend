import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateRoomDto {
  @IsNumber({}, { message: 'examId must be a number' })
  @IsNotEmpty()
  examId: number;
}
