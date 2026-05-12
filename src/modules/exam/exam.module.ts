import { PrismaService } from '@/services/prisma.service';
import { Module } from '@nestjs/common';
import { AiGenerateService } from './ai-generate.service';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { ExcelImportService } from './excel-import.service';

@Module({
  controllers: [ExamController],
  providers: [
    ExamService,
    PrismaService,
    ExcelImportService,
    AiGenerateService,
  ],
})
export class ExamModule {}
