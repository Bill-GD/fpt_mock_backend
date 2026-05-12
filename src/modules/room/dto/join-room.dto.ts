import { IsNumber, IsPositive } from 'class-validator';

export class JoinRoomDto {
  @IsNumber()
  @IsPositive()
  roomId: number;
}
