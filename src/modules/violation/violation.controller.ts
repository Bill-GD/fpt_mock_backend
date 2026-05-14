import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@/common/decorators/role.decorator';
import { UserRoleEnum } from '@/common/enums/user-role.enum';
import { AuthenticatedGuard } from '@/common/guards/authenticated.guard';
import { RoleGuard } from '@/common/guards/role.guard';
import { RequesterID } from '@/common/decorators';
import { ControllerResponse } from '@/common/utils/controller-response';
import { ViolationService } from './violation.service';

@Controller('violations')
@UseGuards(AuthenticatedGuard, RoleGuard)
export class ViolationController {
  constructor(private readonly violationService: ViolationService) {}

  @Get('count')
  @Role(UserRoleEnum.TEACHER)
  async countByTeacher(@RequesterID() teacherId: number) {
    const res = await this.violationService.countByTeacher(teacherId);
    if (!res.success) {
      throw new BadRequestException(res.message);
    }
    return ControllerResponse.ok(HttpStatus.OK, res);
  }

  @Get('student')
  @Role(UserRoleEnum.TEACHER)
  async listByStudent(
    @RequesterID() teacherId: number,
    @Query('attemptId') attemptIdStr: string,
  ) {
    const attemptId = parseInt(attemptIdStr, 10);
    if (isNaN(attemptId)) {
      throw new BadRequestException('Invalid attemptId');
    }

    const res = await this.violationService.listByStudent(attemptId, teacherId);
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
    return ControllerResponse.ok(HttpStatus.OK, res);
  }
}
