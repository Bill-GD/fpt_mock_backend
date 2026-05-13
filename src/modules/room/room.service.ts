import { RoomQuery } from '@/common/queries/room.query';
import { Result } from '@/common/utils/result';
import { Prisma } from '@/database/generated/prisma/client';
import { PrismaService } from '@/services/prisma.service';
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class RoomService {
  constructor(private readonly prisma: PrismaService) { }

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
          startedAt: true,
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
      startedAt: r.startedAt,
      createdAt: r.createdAt,
      attemptCount: r._count.attempts,
    }));

    return Result.ok('Fetched rooms', { rooms: shaped, total });
  }

  private async generateUniqueCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 ký tự, bỏ O, 0, I, 1
    let isUnique = false;
    let newCode = '';

    while (!isUnique) {
      newCode = Array.from(
        { length: 6 },
        () => chars[crypto.randomInt(0, chars.length)],
      ).join('');

      const existingRoom = await this.prisma.room.findUnique({
        where: { code: newCode },
      });

      if (!existingRoom) isUnique = true;
    }
    return newCode;
  }

  async createRoom(requesterId: number, examId: number) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, teacherId: true },
    });

    if (!exam) {
      return Result.fail(`Exam #${examId} doesn't exist`);
    }
    if (exam.teacherId !== requesterId) {
      return Result.fail('Forbidden: only owner can create rooms for this exam');
    }

    const code = await this.generateUniqueCode();

    const room = await this.prisma.room.create({
      data: {
        examId,
        teacherId: requesterId,
        code,
        startedAt: new Date(),
        status: 'WAITING',
      },
    });

    return Result.ok('Room created successfully', { room });
  }

  async joinRoom(studentId: number, code: string) {
    const room = await this.prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: { exam: true },
    });

    if (!room) {
      return Result.fail("Room not found");
    }
    if (room.status !== 'ACTIVE' && room.status !== 'WAITING') {
      return Result.fail("Room is no longer active");
    }

    const now = new Date();
    const endTime = new Date(
      room.startedAt.getTime() + room.exam.durationMinutes * 60000,
    );

    if (now > endTime && room.status === 'ACTIVE') {
      await this.prisma.room.update({
        where: { id: room.id },
        data: { status: 'FINISHED' },
      });
      return Result.fail("Time is up. Room is closed");
    }

    let attempt = await this.prisma.attempt.findFirst({
      where: { roomId: room.id, studentId },
    });

    if (!attempt) {
      attempt = await this.prisma.attempt.create({
        data: {
          roomId: room.id,
          studentId,
        },
      });
    }

    return Result.ok('Joined room successfully', { room, attemptId: attempt.id });
  }

  async getStudentHistory(studentId: number, query: { limit?: number; offset?: number }) {
    const limit = query.limit || 10;
    const offset = query.offset || 0;

    const [attempts, total] = await Promise.all([
      this.prisma.attempt.findMany({
        where: { studentId },
        include: {
          room: {
            include: { exam: { select: { title: true, durationMinutes: true } } },
          },
          _count: { select: { violations: true } },
        },
        orderBy: { submittedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.attempt.count({ where: { studentId } }),
    ]);

    const history = attempts.map((a) => ({
      attemptId: a.id,
      examTitle: a.room.exam.title,
      durationMinutes: a.room.exam.durationMinutes,
      roomCode: a.room.code,
      score: a.score,
      submittedAt: a.submittedAt,
      violationCount: a._count.violations,
    }));

    return Result.ok('Fetched student history', { history, total });
  }

}
