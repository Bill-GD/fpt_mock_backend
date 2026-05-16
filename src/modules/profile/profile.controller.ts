import { RequesterID } from '@/common/decorators';
import { AuthenticatedGuard } from '@/common/guards/authenticated.guard';
import { ControllerResponse } from '@/common/utils/controller-response';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@Controller('profile')
@UseGuards(AuthenticatedGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  async me(@RequesterID() requesterId: number) {
    const res = await this.profileService.me(requesterId);
    if (!res.success) {
      throw new NotFoundException(res.message);
    }
    return ControllerResponse.ok(HttpStatus.OK, res);
  }

  @Post('update')
  async update(
    @RequesterID() requesterId: number,
    @Body() dto: UpdateProfileDto,
  ) {
    if (!dto.username) {
      throw new BadRequestException('Nothing to update');
    }
    const res = await this.profileService.update(requesterId, dto);
    if (!res.success) {
      throw new ConflictException(res.message);
    }
    return ControllerResponse.ok(HttpStatus.NO_CONTENT, res);
  }
}
