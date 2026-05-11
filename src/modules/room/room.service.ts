import { RoomQuery } from '@/common/queries/room.query';
import { Result } from '@/common/utils/result';
import { Prisma } from '@/database/generated/prisma/client';
import { PrismaService } from '@/services/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoomService {
  constructor(private readonly prisma: PrismaService) {}

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
}
