import { RequesterID, Role } from '@/common/decorators';
import { UserRoleEnum } from '@/common/enums/user-role.enum';
import { AuthenticatedGuard } from '@/common/guards/authenticated.guard';
import { RoleGuard } from '@/common/guards/role.guard';
import { ViolationQuery } from '@/common/queries/violation.query';
import { ControllerResponse } from '@/common/utils/controller-response';
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

  @Get()
  @Role(UserRoleEnum.TEACHER)
  async listByStudent(
    @RequesterID() teacherId: number,
    @Query() query: ViolationQuery,
  ) {
    const res = await this.violationService.listByStudent(
      query.attemptId,
      teacherId,
    );
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
