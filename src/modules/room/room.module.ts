import { PrismaService } from '@/services/prisma.service';
import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { RoomController } from './room.controller';
import { RoomGateway } from './room.gateway';
import { RoomService } from './room.service';

@Module({
  controllers: [RoomController],
  providers: [RoomService, PrismaService, RoomGateway, OtpService],
})
export class RoomModule {}
