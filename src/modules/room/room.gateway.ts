import { WsRequester } from '@/common/decorators';
import { RoomStatusEnum } from '@/common/enums/room-status.enum';
import { UserRoleEnum } from '@/common/enums/user-role.enum';
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
import { StudentViolationDto } from '../violation/dto/student-violation.dto';
import { ViolationService } from '../violation/violation.service';
import { RoomIdentificationDto } from './dto/room-identification.dto';
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

  constructor(
    private readonly roomService: RoomService,
    private readonly violationService: ViolationService,
  ) {}

  @SubscribeMessage('join')
  async joinQuizRoom(
    @WsRequester() requester: JwtUserPayload,
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: RoomIdentificationDto,
  ) {
    const room = await this.roomService.findRoomByCode(dto.code!);
    if (!room) {
      return 'Room not found';
    }

    const status = await this.roomService.getRoomStatus(room.id);
    if (!status || (status as any) !== RoomStatusEnum.WAITING) {
      return 'Room is not open for joining';
    }

    const roomWsId = getRoomWsId(room.id);
    await client.join(roomWsId);
    if (requester.role === UserRoleEnum.STUDENT) {
      this.server.to(roomWsId).emit('student_join', requester);
    }
    return `Joined quiz room ${roomWsId}`;
  }

  @SubscribeMessage('leave')
  async leaveQuizRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: RoomIdentificationDto,
  ) {
    const roomWsId = getRoomWsId(dto.id);
    await client.leave(roomWsId);
    return `Left quiz room ${roomWsId}`;
  }

  @SubscribeMessage('start')
  async startRoom(@MessageBody() dto: RoomIdentificationDto) {
    const res = await this.roomService.startRoom(dto.id);
    if (!res.success) {
      return res.message;
    }

    const roomWsId = getRoomWsId(dto.id);
    this.server.to(roomWsId).emit('room_start', res.data);

    const durationMs = res.data!.durationMinutes * 60 * 1000;
    setTimeout(() => {
      this.roomService
        .endRoom(dto.id)
        .then(async (endRes) => {
          if (endRes.success) {
            const forceRes = await this.roomService.forceSubmitAllAttempts(
              dto.id,
            );
            this.server.to(roomWsId).emit('room_time_up');
            if (forceRes.success) {
              this.server
                .to(roomWsId)
                .emit('force_submit', { count: forceRes.data?.count });
            }
          }
        })
        .catch((e) => {
          console.error(`Failed to end room #${dto.id}:`, e);
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

  @SubscribeMessage('violation')
  async reportViolation(
    @WsRequester() requester: JwtUserPayload,
    @MessageBody() dto: StudentViolationDto,
  ) {
    const res = await this.violationService.logViolation(
      requester.id,
      dto.attemptId,
      dto,
    );
    if (!res.success) {
      return res.message;
    }
    this.server
      .to(getRoomWsId(dto.roomId))
      .emit('log_violation', { student: requester, ...res.data });
    return 'Violation logged';
  }
}
