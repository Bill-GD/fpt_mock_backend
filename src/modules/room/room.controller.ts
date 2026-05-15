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
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  // Public endpoint — no auth needed, student uses to lookup room by PIN
  @Get('public/:code')
  async findByCode(@Param('code') code: string) {
    const res = await this.roomService.findRoomInfoByCode(code);
    if (!res) {
      throw new NotFoundException(`Room with code "${code}" not found`);
    }
    return ControllerResponse.ok(HttpStatus.OK, 'Room found', res);
  }

  @Get()
  @UseGuards(AuthenticatedGuard, RoleGuard)
  @Role(UserRoleEnum.TEACHER)
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

  @Get('history')
  @UseGuards(AuthenticatedGuard)
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

  @Get(':id')
  @UseGuards(AuthenticatedGuard, RoleGuard)
  @Role(UserRoleEnum.TEACHER)
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
  @UseGuards(AuthenticatedGuard, RoleGuard)
  @Role(UserRoleEnum.TEACHER)
  async create(@RequesterID() requesterId: number, @Body() dto: CreateRoomDto) {
    const res = await this.roomService.createRoom(requesterId, dto);
    if (!res.success) {
      handleServiceError(res);
    }
    return ControllerResponse.ok(HttpStatus.CREATED, res);
  }

  @Post(':id/open')
  @UseGuards(AuthenticatedGuard, RoleGuard)
  @Role(UserRoleEnum.TEACHER)
  async openRoom(@Param('id', ParseIntPipe) id: number) {
    const res = await this.roomService.openRoom(id);
    if (!res.success) {
      handleServiceError(res);
    }
    return ControllerResponse.ok(HttpStatus.NO_CONTENT, res);
  }
}
