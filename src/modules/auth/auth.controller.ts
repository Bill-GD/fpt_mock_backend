import { ControllerResponse } from '@/common/utils/controller-response';
import {
  Body,
  ConflictException,
  Controller,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { type Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const checkRes = await this.authService.checkEmail(dto.email);
    if (!checkRes.success) {
      throw new ConflictException(checkRes.message);
    }
    const res = await this.authService.register(dto);
    return ControllerResponse.ok(HttpStatus.CREATED, res);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res() response: Response) {
    const res = await this.authService.login(dto);
    if (!res.success) throw new UnauthorizedException(res.message);
    response.cookie('jwt', res.data?.token, {
      maxAge: 1000 * 3600 * 24, // 1d
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
    });
    return ControllerResponse.ok(HttpStatus.OK, res);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('jwt', {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
    });
    return ControllerResponse.ok(
      HttpStatus.OK,
      'Logged out successfully',
      null,
    );
  }
}
