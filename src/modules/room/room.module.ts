import { PrismaService } from '@/services/prisma.service';
import { Module } from '@nestjs/common';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';

@Module({
  controllers: [RoomController],
  providers: [RoomService, PrismaService],
})
export class RoomModule {}
