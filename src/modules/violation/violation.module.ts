import { Module } from '@nestjs/common';
import { ViolationService } from './violation.service';
import { ViolationController } from './violation.controller';

@Module({
  controllers: [ViolationController],
  providers: [ViolationService],
  exports: [ViolationService],
})
export class ViolationModule {}
