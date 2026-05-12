import { ControllerResponse } from '@/common/utils/controller-response';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(error: Error, host: ArgumentsHost) {
    if (!(error instanceof HttpException)) {
      console.log(error.stack);
      error = new InternalServerErrorException(error);
    }

    this.httpAdapterHost.httpAdapter.reply(
      host.switchToHttp().getResponse(),
      ControllerResponse.fail(error as HttpException),
      error instanceof HttpException
        ? error.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
