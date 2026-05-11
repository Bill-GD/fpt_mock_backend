import { ExamQuery } from '@/common/queries/exam.query';
import { Result } from '@/common/utils/result';
import { Prisma } from '@/database/generated/prisma/client';
import { PrismaService } from '@/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

@Injectable()
export class ExamService {
  constructor(private readonly prisma: PrismaService) {}

  async create(requesterId: number, dto: CreateExamDto) {
    const questions = dto.questions;

    const { id: examId } = await this.prisma.exam.create({
      data: {
        teacherId: requesterId,
        title: dto.title,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        questions: {
          create: questions.map((q) => ({
            content: q.content,
            options: { create: q.options.map((o) => ({ ...o })) },
          })),
        },
      },
      select: { id: true },
    });
    return Result.ok('Exam created', { id: examId });
  }

  async findAll(requesterId: number, query: ExamQuery) {
    const where: Prisma.ExamWhereInput = {
      teacherId: query.teacherId ?? requesterId,
    };

    if (query.title) {
      where.title = { contains: query.title, mode: 'insensitive' };
    }

    if (query.hasActiveRoom) {
      where.rooms = { some: { status: 'ACTIVE' } };
    }

    const [exams, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          durationMinutes: true,
          createdAt: true,
          _count: { select: { questions: true, rooms: true } },
        },
        skip: query.offset,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.exam.count({ where }),
    ]);

    const shaped = exams.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      durationMinutes: e.durationMinutes,
      createdAt: e.createdAt,
      questionCount: e._count.questions,
      roomCount: e._count.rooms,
    }));

    return Result.ok('Fetched exams', { exams: shaped, total });
  }

  async findOne(id: number) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        questions: { include: { options: true } },
        rooms: {
          select: { id: true, code: true, status: true, startedAt: true },
        },
      },
    });
    if (!exam) {
      return Result.fail(`Exam #${id} doesn't exist`);
    }
    return Result.ok('Fetched exam', { exam });
  }

  async update(id: number, requesterId: number, dto: UpdateExamDto) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      select: { id: true, teacherId: true },
    });
    if (!exam) {
      return Result.fail(`Exam #${id} doesn't exist`);
    }
    if (exam.teacherId !== requesterId) {
      return Result.fail('Forbidden: only owner can update exam');
    }

    // For safety, do not support complex question updates via this endpoint
    if (dto.questions && dto.questions.length) {
      return Result.fail(
        'Updating questions is not supported via this endpoint',
      );
    }

    const updated = await this.prisma.exam.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
      },
    });

    return Result.ok('Updated exam', { id: updated.id });
  }
}
