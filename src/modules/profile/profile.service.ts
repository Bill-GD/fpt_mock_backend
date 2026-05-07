import { Result } from '@/common/utils/result';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PrismaService } from '@/services/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async me(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: { password: true },
    });
    if (!user) {
      return Result.fail(`User #${id} doesn't exist`);
    }
    return Result.ok('Fetched profile', { user });
  }

  async update(id: number, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      return Result.fail(`User #${id} doesn't exist`);
    }

    // update username only for now
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        username: dto.username ?? user.username,
      },
    });

    const sanitized = await this.prisma.user.findUnique({
      where: { id: updated.id },
      omit: { password: true },
    });

    return Result.ok('Updated profile', { user: sanitized });
  }

  async delete(id: number) {
    const res = await this.prisma.user.deleteMany({ where: { id } });
    if (res.count === 0) {
      return Result.fail(`User #${id} doesn't exist`);
    }

    return Result.ok('Deleted profile', null);
  }
}
