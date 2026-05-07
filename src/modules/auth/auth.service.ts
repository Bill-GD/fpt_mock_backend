import { Result } from '@/common/utils/result';
import { JwtUserPayload } from '@/common/utils/types';
import { UserRole } from '@/database/generated/prisma/client';
import { PrismaService } from '@/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  async checkEmail(email: string) {
    const emailInUse =
      (await this.prisma.user.findUnique({
        where: { email },
      })) != null;

    if (emailInUse) {
      return Result.fail('Email is already in use');
    }
    return Result.ok('Email is available', null);
  }

  async register(dto: RegisterDto) {
    const hashedPassword = bcrypt.hashSync(dto.password, 10);

    const [user] = await this.prisma.user.createManyAndReturn({
      data: [
        {
          ...dto,
          role: dto.role.toUpperCase() as UserRole,
          password: hashedPassword,
        },
      ],
    });

    return Result.ok('Registered successfully', { id: user.id });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (!user) {
      return Result.fail("Email doesn't exist");
    }
    if (!bcrypt.compareSync(dto.password, user.password)) {
      return Result.fail('Incorrect password');
    }

    const payload: JwtUserPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role.toLowerCase() as JwtUserPayload['role'],
    };

    return Result.ok('Login successfully', {
      token: this.jwt.sign(payload, { expiresIn: '1d' }),
    });
  }
}
