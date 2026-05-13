import { WsRequester } from '@/common/decorators';
import { UserRoleEnum } from '@/common/enums/user-role.enum';
import { RoomStatusEnum } from '@/common/enums/room-status.enum';
import { WebSocketFilter } from '@/common/filters/web-socket.filter';
import { WsAuthenticatedGuard } from '@/common/guards/authenticated.ws.guard';
import { getRoomWsId } from '@/common/utils/helpers';
import { type JwtUserPayload } from '@/common/utils/types';
import { UseFilters, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JoinRoomDto } from './dto/join-room.dto';
import { StudentAnswerDto } from './dto/student-answer.dto';
import { RoomService } from './room.service';

@WebSocketGateway({
  namespace: 'roomws',
  cors: {
    origin: process.env.FRONTEND_HOST,
    credentials: true,
  },
})
@UseFilters(WebSocketFilter)
@UseGuards(WsAuthenticatedGuard)
export class RoomGateway {
  @WebSocketServer() private server: Server;

  constructor(private readonly roomService: RoomService) {}

  @SubscribeMessage('join')
  async joinQuizRoom(
    @WsRequester() requester: JwtUserPayload,
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinRoomDto,
  ) {
    const status = await this.roomService.getRoomStatus(dto.roomId);

    if (!status || (status as any) !== RoomStatusEnum.WAITING) {
      return 'Room is not open for joining';
    }

    const roomWsId = getRoomWsId(dto.roomId);
    await client.join(roomWsId);
    if (requester.role === UserRoleEnum.STUDENT) {
      this.server.to(getRoomWsId(dto.roomId)).emit('student_join', requester);
    }
    return `Joined quiz room ${roomWsId}`;
  }

  @SubscribeMessage('leave')
  async leaveQuizRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinRoomDto,
  ) {
    const roomWsId = getRoomWsId(dto.roomId);
    await client.leave(roomWsId);
    return `Left quiz room ${roomWsId}`;
  }

  @SubscribeMessage('start')
  async startRoom(@MessageBody() dto: JoinRoomDto) {
    const res = await this.roomService.startRoom(dto.roomId);
    if (!res.success) {
      return res.message;
    }

    this.server.to(getRoomWsId(dto.roomId)).emit('room_start', res.data);

    const durationMs = res.data!.durationMinutes * 60 * 1000;
    setTimeout(() => {
      this.roomService
        .endRoom(dto.roomId)
        .then(async (endRes) => {
          if (endRes.success) {
            const forceRes = await this.roomService.forceSubmitAllAttempts(
              dto.roomId,
            );
            this.server.to(getRoomWsId(dto.roomId)).emit('room_time_up');
            if (forceRes.success) {
              this.server
                .to(getRoomWsId(dto.roomId))
                .emit('force_submit', { count: forceRes.data?.count });
            }
          }
        })
        .catch((e) => {
          console.error(`Failed to end room #${dto.roomId}:`, e);
        });
    }, durationMs);

    return 'Room started';
  }

  // only submit the answer for individual question
  @SubscribeMessage('answer')
  async studentAnswer(
    @WsRequester() requester: JwtUserPayload,
    @MessageBody() dto: StudentAnswerDto,
  ) {
    const res = await this.roomService.studentAnswer(requester.id, dto);
    if (!res.success) {
      return res.message;
    }
    this.server
      .to(getRoomWsId(dto.roomId))
      .emit('leaderboard', { student: requester, ...res.data! });
    return 'Student answered';
  }

  // submit the attempt
  @SubscribeMessage('submit')
  async studentSubmit(
    @WsRequester() requester: JwtUserPayload,
    @MessageBody() dto: StudentAnswerDto,
  ) {
    const res = await this.roomService.studentSubmit(requester.id, dto);
    if (!res.success) {
      return res.message;
    }
    this.server
      .to(getRoomWsId(dto.roomId))
      .emit('student_submit', { student: requester });
    return 'Student submitted';
  }
}
