import { RequesterID } from '@/common/decorators';
import { AuthenticatedGuard } from '@/common/guards/authenticated.guard';
import { RoomQuery } from '@/common/queries/room.query';
import { ControllerResponse } from '@/common/utils/controller-response';
import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  NotFoundException,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { type Response } from 'express';
import { RoomService } from './room.service';

@Controller('rooms')
@UseGuards(AuthenticatedGuard)
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  async findByExam(
    @Res({ passthrough: true }) response: Response,
    @RequesterID() requesterId: number,
    @Query() query: RoomQuery,
  ) {
    const res = await this.roomService.findByExam(requesterId, query);
    if (!res.success) {
      const msg = res.message.toLowerCase();
      if (msg.includes('forbid')) {
        throw new ForbiddenException(res.message);
      }
      if (msg.includes("doesn't") || msg.includes('not found')) {
        throw new NotFoundException(res.message);
      }
      throw new BadRequestException(res.message);
    }
    response.setHeader('X-Total-Count', `${res.data!.total}`);
    return ControllerResponse.ok(HttpStatus.OK, res);
  }
}
