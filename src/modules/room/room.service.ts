import { RoomStatusEnum } from '@/common/enums/room-status.enum';
import { RoomQuery } from '@/common/queries/room.query';
import { Result } from '@/common/utils/result';
import { Prisma } from '@/database/generated/prisma/client';
import { PrismaService } from '@/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { StudentAnswerDto } from './dto/student-answer.dto';
import { OtpService } from './otp.service';

@Injectable()
export class RoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
  ) {}

  private handleError(error: Error) {
    const message = error.message;
    const errorMap: Record<string, string> = {
      ROOM_NOT_FOUND: 'Room not found',
      ROOM_NOT_ACTIVE: 'Room is not active',
      ATTEMPT_NOT_FOUND: 'Attempt not found',
      ATTEMPT_ALREADY_SUBMITTED: 'Attempt already submitted',
      OPTION_NOT_FOUND: 'Option not found',
      ALREADY_ANSWERED: 'Answer already submitted',
    };

    return Result.fail(errorMap[message] || 'An error occurred');
  }

  async findByExam(requesterId: number, query: RoomQuery) {
    if (!query.examId) {
      return Result.fail('examId is required');
    }

    try {
      const [rooms, total] = await this.prisma.$transaction(async (tx) => {
        const exam = await tx.exam.findUnique({
          where: { id: query.examId },
          select: { id: true, teacherId: true },
        });
        if (!exam) {
          throw new Error('EXAM_NOT_FOUND');
        }
        if (exam.teacherId !== requesterId) {
          throw new Error('FORBIDDEN');
        }

        const where: Prisma.RoomWhereInput = { examId: query.examId };

        if (query.status) {
          where.status = query.status;
        }

        if (query.code) {
          where.code = { contains: query.code, mode: 'insensitive' };
        }

        const [roomsData, count] = await Promise.all([
          tx.room.findMany({
            where,
            select: {
              id: true,
              code: true,
              status: true,
              createdAt: true,
              _count: { select: { attempts: true } },
            },
            skip: query.offset,
            take: query.limit,
            orderBy: { createdAt: 'desc' },
          }),
          tx.room.count({ where }),
        ]);

        return [roomsData, count];
      });

      const shaped = rooms.map((r) => ({
        id: r.id,
        code: r.code,
        status: r.status,
        createdAt: r.createdAt,
        attemptCount: r._count.attempts,
      }));

      return Result.ok('Fetched rooms', { rooms: shaped, total });
    } catch (e) {
      const error = e as Error;
      if (error.message === 'EXAM_NOT_FOUND') {
        return Result.fail(`Exam #${query.examId} doesn't exist`);
      }
      if (error.message === 'FORBIDDEN') {
        return Result.fail(
          'Forbidden: only owner can view rooms for this exam',
        );
      }
      throw e;
    }
  }

  async createRoom(requesterId: number, dto: CreateRoomDto) {
    try {
      const res = await this.prisma.$transaction(async (tx) => {
        const exam = await tx.exam.findUnique({
          where: { id: dto.examId },
          select: { id: true, teacherId: true },
        });
        if (!exam) throw new Error('EXAM_NOT_FOUND');
        if (exam.teacherId !== requesterId) {
          throw new Error('FORBIDDEN');
        }

        const pin = this.otpService.generateOTP();

        return tx.room.create({
          data: {
            examId: dto.examId,
            teacherId: requesterId,
            code: pin,
            status: RoomStatusEnum.INACTIVE,
          },
          select: {
            id: true,
            code: true,
          },
        });
      });

      return Result.ok('Created room', res);
    } catch (e) {
      const error = e as Error;
      if (error.message === 'EXAM_NOT_FOUND') {
        return Result.fail(`Exam #${dto.examId} doesn't exist`);
      }
      if (error.message === 'FORBIDDEN') {
        return Result.fail(
          'Forbidden: only owner can create rooms for this exam',
        );
      }
      throw e;
    }
  }

  async findOne(requesterId: number, roomId: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            durationMinutes: true,
            _count: { select: { questions: true } },
          },
        },
        teacher: { select: { id: true } },
        attempts: {
          select: {
            id: true,
            roomId: true,
            studentId: true,
            student: { select: { id: true, username: true } },
            correctCount: true,
            submittedAt: true,
            _count: { select: { answers: true, violations: true } },
          },
          orderBy: { correctCount: 'desc' },
        },
        _count: { select: { attempts: true } },
      },
    });

    if (!room) return Result.fail(`Room #${roomId} doesn't exist`);

    // only owner (teacher) or participants can view room details
    if (room.teacherId !== requesterId) {
      let isParticipant = false;
      for (const a of room.attempts) {
        if (a.studentId === requesterId) {
          isParticipant = true;
          break;
        }
      }

      if (!isParticipant) {
        return Result.fail(
          'Forbidden: only owner or participants can view this room',
        );
      }
    }

    const attempts = room.attempts.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      username: a.student?.username,
      correctCount: a.correctCount,
      submittedAt: a.submittedAt,
      answerCount: a._count?.answers ?? 0,
      violationCount: a._count?.violations ?? 0,
    }));

    const shaped = {
      id: room.id,
      code: room.code,
      status: room.status,
      createdAt: room.createdAt,
      exam: {
        id: room.exam.id,
        title: room.exam.title,
        durationMinutes: room.exam.durationMinutes,
        questionCount: room.exam._count?.questions ?? 0,
      },
      attemptCount: room._count?.attempts ?? 0,
      attempts,
    };

    return Result.ok('Fetched room', shaped);
  }

  async getRoomStatus(roomId: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { status: true },
    });
    return room?.status ?? null;
  }

  async forceSubmitAllAttempts(roomId: number) {
    const result = await this.prisma.$transaction(async (tx) => {
      const submittedCount = await tx.attempt.updateMany({
        where: { roomId, submittedAt: null },
        data: { submittedAt: new Date() },
      });

      return submittedCount.count;
    });

    return Result.ok('Force submitted attempts', { count: result });
  }

  async openRoom(id: number) {
    try {
      const room = await this.prisma.room.update({
        where: { id },
        data: { status: RoomStatusEnum.WAITING },
        select: { id: true, status: true },
      });

      return Result.ok('Room opened', room);
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-member-access
      if ((e as any).code === 'P2025') {
        return Result.fail(`Room #${id} doesn't exist`);
      }
      throw e;
    }
  }

  async startRoom(id: number) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const room = await tx.room.update({
          where: { id },
          data: { status: RoomStatusEnum.ACTIVE, startedAt: new Date() },
          select: { id: true, startedAt: true, examId: true },
        });

        const exam = await tx.exam.findUnique({
          where: { id: room.examId },
          select: { durationMinutes: true },
        });

        if (!exam) throw new Error('EXAM_NOT_FOUND');

        const startTime = room.startedAt!;
        const endTime = new Date(
          startTime.getTime() + exam.durationMinutes * 60 * 1000,
        );

        return {
          startTime,
          endTime,
          durationMinutes: exam.durationMinutes,
        };
      });

      return Result.ok('Room started', result);
    } catch (e) {
      return this.handleError(e as Error);
    }
  }

  async endRoom(id: number) {
    try {
      const room = await this.prisma.room.update({
        where: { id },
        data: { status: RoomStatusEnum.FINISHED },
        select: { id: true, status: true },
      });

      return Result.ok('Room ended', room);
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-member-access
      if ((e as any).code === 'P2025') {
        return Result.fail(`Room #${id} doesn't exist`);
      }
      throw e;
    }
  }

  async studentAnswer(studentId: number, dto: StudentAnswerDto) {
    let isCorrect = false;
    let correctCount = 0;
    try {
      await this.prisma.$transaction(async (tx) => {
        const room = await tx.room.findUnique({
          where: { id: dto.roomId },
          select: { status: true },
        });
        if (!room) throw new Error('ROOM_NOT_FOUND');
        if ((room.status as RoomStatusEnum) !== RoomStatusEnum.ACTIVE) {
          throw new Error('ROOM_NOT_ACTIVE');
        }

        const attempt = await tx.attempt.findFirst({
          where: { roomId: dto.roomId, studentId },
          select: { id: true, correctCount: true, submittedAt: true },
        });

        if (!attempt) throw new Error('ATTEMPT_NOT_FOUND');
        if (attempt.submittedAt) throw new Error('ATTEMPT_ALREADY_SUBMITTED');
        correctCount = attempt.correctCount;

        const option = await tx.option.findUnique({
          where: { id: dto.optionId },
          select: { isCorrect: true },
        });
        if (!option) throw new Error('OPTION_NOT_FOUND');

        const existing = await tx.answer.findFirst({
          where: { attemptId: attempt.id, questionId: dto.questionId },
        });
        if (existing) throw new Error('ALREADY_ANSWERED');

        await tx.answer.create({
          data: {
            attemptId: attempt.id,
            questionId: dto.questionId,
            selectedOptionId: dto.optionId,
          },
        });

        if (option.isCorrect) {
          isCorrect = true;
          await tx.attempt.update({
            where: { id: attempt.id },
            data: { correctCount: { increment: 1 } },
          });
          correctCount++;
        }
      });
    } catch (e) {
      return this.handleError(e as Error);
    }

    return Result.ok('Answer recorded', { isCorrect, correctCount });
  }

  async studentSubmit(studentId: number, dto: StudentAnswerDto) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const room = await tx.room.findUnique({
          where: { id: dto.roomId },
          select: { status: true },
        });
        if (!room) throw new Error('ROOM_NOT_FOUND');
        if ((room.status as RoomStatusEnum) !== RoomStatusEnum.ACTIVE) {
          throw new Error('ROOM_NOT_ACTIVE');
        }

        const attempt = await tx.attempt.findFirst({
          where: { roomId: dto.roomId, studentId },
          select: { id: true, submittedAt: true },
        });

        if (!attempt) throw new Error('ATTEMPT_NOT_FOUND');
        if (attempt.submittedAt) throw new Error('ATTEMPT_ALREADY_SUBMITTED');

        await tx.attempt.update({
          where: { id: attempt.id },
          data: { submittedAt: new Date() },
        });
      });
    } catch (e) {
      return this.handleError(e as Error);
    }

    return Result.ok('Attempt submitted', {});
  }
}
