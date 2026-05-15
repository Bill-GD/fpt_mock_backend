import { Result } from '@/common/utils/result';
import { PrismaService } from '@/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { StudentViolationDto } from './dto/student-violation.dto';

@Injectable()
export class ViolationService {
  constructor(private readonly prisma: PrismaService) {}

  async countByTeacher(teacherId: number) {
    const count = await this.prisma.violationLog.count({
      where: {
        attempt: {
          room: {
            teacherId,
          },
        },
      },
    });

    return Result.ok('Counted violations', { count });
  }

  async listByStudent(attemptId: number, teacherId: number) {
    const violations = await this.prisma.violationLog.findMany({
      where: {
        attemptId,
        attempt: {
          room: {
            teacherId,
          },
        },
      },
      select: {
        id: true,
        violationType: true,
        evidenceUrl: true,
        timestamp: true,
      },
      orderBy: { timestamp: 'desc' },
    });

    return Result.ok('Fetched violations', violations);
  }

  async logViolation(
    studentId: number,
    attemptId: number,
    dto: StudentViolationDto,
  ) {
    const violation = await this.prisma.violationLog.create({
      data: {
        attemptId,
        studentId,
        violationType: dto.violationType!,
        evidenceUrl: dto.evidenceUrl,
      },
      select: {
        id: true,
        violationType: true,
        timestamp: true,
      },
    });

    return Result.ok('Violation logged', violation);
  }
}
