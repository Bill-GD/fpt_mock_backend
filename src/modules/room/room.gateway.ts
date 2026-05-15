import { WsRequester } from '@/common/decorators';
import { RoomStatusEnum } from '@/common/enums/room-status.enum';
import { UserRoleEnum } from '@/common/enums/user-role.enum';
import { ViolationType } from '@/common/enums/violation-type.enum';
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

  /**
   * Join a quiz room WS channel.
   * - Teacher: can join any non-FINISHED room (INACTIVE/WAITING/ACTIVE)
   * - Student: can join WAITING or ACTIVE rooms; attempt is created on join
   * Returns: { roomId, status, attemptId? }
   */
  @SubscribeMessage('join')
  async joinQuizRoom(
    @WsRequester() requester: JwtUserPayload,
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: RoomIdentificationDto,
  ) {
    // Look up room by code (or id if code not provided)
    let roomId: number | undefined;
    if (dto.code) {
      const room = await this.roomService.findRoomByCode(dto.code);
      if (!room) return { error: 'Room not found' };
      roomId = room.id;
    } else if (dto.id) {
      roomId = dto.id;
    } else {
      return { error: 'Room code or id required' };
    }

    const rawStatus = await this.roomService.getRoomStatus(roomId);
    if (!rawStatus) return { error: 'Room not found' };

    // Prisma maps enums to lowercase in DB; normalize to match RoomStatusEnum
    const status = (rawStatus as string).toUpperCase() as RoomStatusEnum;

    if (status === RoomStatusEnum.FINISHED) {
      return { error: 'Room is finished' };
    }

    // Students cannot join INACTIVE rooms
    if (
      requester.role === UserRoleEnum.STUDENT &&
      status === RoomStatusEnum.INACTIVE
    ) {
      return { error: 'Room is not open for joining yet' };
    }

    const roomWsId = getRoomWsId(roomId);
    await client.join(roomWsId);

    // For students: create (or retrieve) their attempt and notify room
    if (requester.role === UserRoleEnum.STUDENT) {
      let attemptId: number | undefined;

      // Only create attempt when room is WAITING or ACTIVE
      if (
        status === RoomStatusEnum.WAITING ||
        status === RoomStatusEnum.ACTIVE
      ) {
        const attempt = await this.roomService.createAttempt(
          requester.id,
          roomId,
        );
        attemptId = attempt?.id;
      }

      this.server.to(roomWsId).emit('student_join', {
        id: requester.id,
        username: requester.username,
      });

      return { roomId, status, attemptId };
    }

    // Teacher — return normalized status so frontend comparison works
    return { roomId, status };
  }

  @SubscribeMessage('leave')
  async leaveQuizRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: RoomIdentificationDto,
  ) {
    if (!dto.id) return 'No room id provided';
    const roomWsId = getRoomWsId(dto.id);
    await client.leave(roomWsId);
    return `Left quiz room ${roomWsId}`;
  }

  /**
   * Teacher starts the room.
   * Emits room_start to all members with timing info.
   * Schedules auto-end after exam duration.
   */
  @SubscribeMessage('start')
  async startRoom(@MessageBody() dto: RoomIdentificationDto) {
    if (!dto.id) return 'Room id required';

    const res = await this.roomService.startRoom(dto.id);
    if (!res.success) {
      return res.message;
    }

    const roomWsId = getRoomWsId(dto.id);
    this.server.to(roomWsId).emit('room_start', res.data);

    const durationMs = res.data!.durationMinutes * 60 * 1000;
    setTimeout(() => {
      void (async () => {
        try {
          // Notify clients while room is still ACTIVE so they can submit
          this.server.to(roomWsId).emit('room_time_up');
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await this.roomService.forceSubmitAllAttempts(dto.id!);
          const endRes = await this.roomService.endRoom(dto.id!);
          if (endRes.success) {
            this.server.to(roomWsId).emit('force_submit', { roomId: dto.id });
          }
        } catch (e) {
          console.error(`Failed to end room #${dto.id}:`, e);
        }
      })();
    }, durationMs);

    return 'Room started';
  }

  /** Student submits answer for a single question */
  @SubscribeMessage('answer')
  async studentAnswer(
    @WsRequester() requester: JwtUserPayload,
    @MessageBody() dto: StudentAnswerDto,
  ) {
    const res = await this.roomService.studentAnswer(requester.id, dto);
    if (!res.success) {
      return { error: res.message };
    }
    this.server
      .to(getRoomWsId(dto.roomId))
      .emit('leaderboard', { student: requester, ...res.data! });
    return { success: true, ...res.data! };
  }

  /** Student submits their attempt (final submission) */
  @SubscribeMessage('submit')
  async studentSubmit(
    @WsRequester() requester: JwtUserPayload,
    @MessageBody() dto: StudentAnswerDto,
  ) {
    const res = await this.roomService.studentSubmit(requester.id, dto);
    if (!res.success) {
      return { error: res.message };
    }

    const resultData = res.data as { correctCount: number; totalQuestions: number };

    // Notify all room members (teacher leaderboard update)
    this.server
      .to(getRoomWsId(dto.roomId))
      .emit('student_submit', {
        student: { id: requester.id, username: requester.username },
        ...resultData,
      });

    // Return full result to the submitting student via callback
    return { success: true, ...resultData };
  }

  /** Student reports a proctoring violation */
  @SubscribeMessage('violation')
  async reportViolation(
    @WsRequester() requester: JwtUserPayload,
    @MessageBody() dto: StudentViolationDto,
  ) {
    // Resolve attemptId: use provided or look up by studentId + roomId
    let attemptId = dto.attemptId;
    if (!attemptId) {
      const attempt = await this.roomService.createAttempt(
        requester.id,
        dto.roomId,
      );
      attemptId = attempt?.id;
    }

    if (!attemptId) {
      return { error: 'Attempt not found' };
    }

    // Map frontend lowercase type → backend UPPERCASE ViolationType enum
    const typeMap: Record<string, ViolationType> = {
      tab_switch: ViolationType.TAB_SWITCH,
      keyboard_copy: ViolationType.KEYBOARD_COPY,
      keyboard_paste: ViolationType.KEYBOARD_PASTE,
      camera_multiple_faces: ViolationType.CAMERA_MULTIPLE_FACES,
      camera_gaze_away: ViolationType.CAMERA_GAZE_AWAY,
      camera_missing: ViolationType.CAMERA_MISSING,
    };

    const rawType = dto.violationType ?? (dto.type as string) ?? 'tab_switch';
    const violationType =
      typeMap[rawType.toLowerCase()] ??
      (rawType.toUpperCase() as ViolationType) ??
      ViolationType.OTHER;

    const evidenceUrl = dto.evidenceUrl ?? dto.description;

    const res = await this.violationService.logViolation(requester.id, attemptId, {
      roomId: dto.roomId,
      attemptId,
      violationType,
      evidenceUrl,
    });

    if (!res.success) {
      return { error: res.message };
    }
    this.server
      .to(getRoomWsId(dto.roomId))
      .emit('log_violation', {
        student: { id: requester.id, username: requester.username },
        // spread res.data first, then override violationType to ensure no duplicate key
        ...(res.data as object),
        violationType,
      });
    return { success: true };
  }
}
