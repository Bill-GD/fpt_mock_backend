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

  async findByExam(requesterId: number, query: RoomQuery) {
    if (!query.examId) {
      return Result.fail('examId is required');
    }

    const exam = await this.prisma.exam.findUnique({
      where: { id: query.examId },
      select: { id: true, teacherId: true },
    });
    if (!exam) {
      return Result.fail(`Exam #${query.examId} doesn't exist`);
    }
    if (exam.teacherId !== requesterId) {
      return Result.fail('Forbidden: only owner can view rooms for this exam');
    }

    const where: Prisma.RoomWhereInput = { examId: query.examId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.code) {
      where.code = { contains: query.code, mode: 'insensitive' };
    }

    const [rooms, total] = await Promise.all([
      this.prisma.room.findMany({
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
      this.prisma.room.count({ where }),
    ]);

    const shaped = rooms.map((r) => ({
      id: r.id,
      code: r.code,
      status: r.status,
      createdAt: r.createdAt,
      attemptCount: r._count.attempts,
    }));

    return Result.ok('Fetched rooms', { rooms: shaped, total });
  }

  async createRoom(requesterId: number, dto: CreateRoomDto) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: dto.examId },
      select: { id: true, teacherId: true },
    });
    if (!exam) return Result.fail(`Exam #${dto.examId} doesn't exist`);
    if (exam.teacherId !== requesterId) {
      return Result.fail(
        'Forbidden: only owner can create rooms for this exam',
      );
    }

    const pin = this.otpService.generateOTP();

    const res = await this.prisma.room.create({
      data: {
        examId: dto.examId,
        teacherId: requesterId,
        code: pin,
      },
      select: {
        id: true,
        code: true,
      },
    });

    return Result.ok('Created room', res);
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

  async studentAnswer(studentId: number, dto: StudentAnswerDto) {
    let isCorrect = false;
    let correctCount = 0;
    try {
      await this.prisma.$transaction(async (tx) => {
        const attempt = await tx.attempt.findFirst({
          where: { roomId: dto.roomId, studentId },
        });

        if (!attempt) throw new Error('ATTEMPT_NOT_FOUND');
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
      if ((e as Error).message === 'ATTEMPT_NOT_FOUND') {
        return Result.fail('Attempt not found');
      }
      if ((e as Error).message === 'OPTION_NOT_FOUND') {
        return Result.fail('Option not found');
      }
      if ((e as Error).message === 'ALREADY_ANSWERED') {
        return Result.fail('Answer already submitted');
      }
      throw e;
    }

    return Result.ok('Answer recorded', { isCorrect, correctCount });
  }
}
