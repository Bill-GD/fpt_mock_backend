import { RequesterID, Role } from '@/common/decorators';
import { UserRoleEnum } from '@/common/enums/user-role.enum';
import { AuthenticatedGuard } from '@/common/guards/authenticated.guard';
import { RoleGuard } from '@/common/guards/role.guard';
import { RoomQuery } from '@/common/queries/room.query';
import { ControllerResponse } from '@/common/utils/controller-response';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { type Response } from 'express';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomService } from './room.service';

const handleServiceError = (res: { message: string }) => {
  const msg = res.message.toLowerCase();
  if (msg.includes('forbid')) {
    throw new ForbiddenException(res.message);
  }
  if (msg.includes("doesn't") || msg.includes('not found')) {
    throw new NotFoundException(res.message);
  }
  throw new BadRequestException(res.message);
};

@Controller('rooms')
@UseGuards(AuthenticatedGuard, RoleGuard)
@Role(UserRoleEnum.TEACHER)
export class RoomController {
  constructor(private readonly roomService: RoomService) { }

  @Get()
  async findByExam(
    @Res({ passthrough: true }) response: Response,
    @RequesterID() requesterId: number,
    @Query() query: RoomQuery,
  ) {
    const res = await this.roomService.findByExam(requesterId, query);
    if (!res.success) {
      handleServiceError(res);
    }
    response.setHeader('X-Total-Count', `${res.data!.total}`);
    return ControllerResponse.ok(HttpStatus.OK, res);
  }
  @Post()
  async createRoom(
    @RequesterID() requesterId: number,
    @Body('examId') examId: number,
  ) {
    if (!examId) throw new BadRequestException('examId is required');
    const res = await this.roomService.createRoom(requesterId, examId);
    if (!res.success) {
      if (res.message.toLowerCase().includes('forbid')) {
        throw new ForbiddenException(res.message);
      }
      throw new BadRequestException(res.message);
    }
    return ControllerResponse.ok(HttpStatus.CREATED, res);
  }

  @Get('history')
  async getStudentHistory(
    @Res({ passthrough: true }) response: Response,
    @RequesterID() studentId: number,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    const res = await this.roomService.getStudentHistory(studentId, {
      limit: parsedLimit,
      offset: parsedOffset,
    });

    response.setHeader('X-Total-Count', `${res.data!.total}`);
    return ControllerResponse.ok(HttpStatus.OK, res);
  }

  @Post('join')
  async joinRoom(
    @RequesterID() studentId: number,
    @Body('code') code: string,
  ) {
    if (!code) throw new BadRequestException('Room code is required');
    const res = await this.roomService.joinRoom(studentId, code);

    if (!res.success) {
      if (res.message.toLowerCase().includes('not found')) {
        throw new NotFoundException(res.message);
      }
      throw new BadRequestException(res.message);
    }
    return ControllerResponse.ok(HttpStatus.OK, res);
  }



  @Get(':id')
  async findOne(
    @RequesterID() requesterId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const res = await this.roomService.findOne(requesterId, id);
    if (!res.success) {
      handleServiceError(res);
    }
    return ControllerResponse.ok(HttpStatus.OK, res);
  }

  @Post()
  async create(@RequesterID() requesterId: number, @Body() dto: CreateRoomDto) {
    const res = await this.roomService.createRoom(requesterId, dto);
    if (!res.success) {
      handleServiceError(res);
    }
    return ControllerResponse.ok(HttpStatus.CREATED, res);
  }

  @Post(':id/open')
  async openRoom(@Param('id', ParseIntPipe) id: number) {
    const res = await this.roomService.openRoom(id);
    if (!res.success) {
      handleServiceError(res);
    }
    return ControllerResponse.ok(HttpStatus.NO_CONTENT, res);
  }
}
