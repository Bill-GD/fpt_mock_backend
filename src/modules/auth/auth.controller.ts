import { ControllerResponse } from '@/common/utils/controller-response';
import { JwtUserPayload } from '@/common/utils/types';
import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { type Request, type Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedGuard } from '@/common/guards/authenticated.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

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
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    console.log("vao controller");
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

  @Get('me')
  @UseGuards(AuthenticatedGuard)
  getMe(@Req() req: Request) {
    const user = req.authUser as JwtUserPayload;
    return ControllerResponse.ok(HttpStatus.OK, 'User retrieved', {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });
  }
}
