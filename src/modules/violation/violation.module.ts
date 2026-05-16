import { Module } from '@nestjs/common';
import { ViolationController } from './violation.controller';
import { ViolationService } from './violation.service';
import { PrismaService } from '@/services/prisma.service';

@Module({
  controllers: [ViolationController],
  providers: [ViolationService, PrismaService],
  exports: [ViolationService],
})
export class ViolationModule { }
