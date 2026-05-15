import { ViolationModule } from '@/modules/violation/violation.module';
import { OtpService } from '@/services/otp.service';
import { PrismaService } from '@/services/prisma.service';
import { Module } from '@nestjs/common';
import { RoomController } from './room.controller';
import { RoomGateway } from './room.gateway';
import { RoomService } from './room.service';

@Module({
  imports: [ViolationModule],
  controllers: [RoomController],
  providers: [RoomService, PrismaService, RoomGateway, OtpService],
})
export class RoomModule {}
