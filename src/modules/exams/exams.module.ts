import { Module } from '@nestjs/common';
import { ExamsController } from './exams.controller';
import { ExcelImportService } from './excel-import.service';
import { AiGenerateService } from './ai-generate.service';
import { PrismaService } from '../../services/prisma.service'; 

@Module({
  controllers: [ExamsController],
  providers: [ExcelImportService, AiGenerateService, PrismaService],
})
export class ExamsModule {}