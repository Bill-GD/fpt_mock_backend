import { HttpException, HttpStatus } from '@nestjs/common';
import { Result } from './result';

export class ControllerResponse<T> {
  private constructor(
    readonly success: boolean,
    readonly status: number,
    readonly message: string,
    readonly data: T,
    readonly error: string | null,
  ) {}

  static ok<T>(
    status: HttpStatus,
    message: string,
    data: T,
  ): ControllerResponse<T>;
  static ok<T>(status: HttpStatus, result: Result<T>): ControllerResponse<T>;

  static ok<T>(status: HttpStatus, arg2: Result<T> | string, data?: T) {
    if (arg2 instanceof Result) {
      return new ControllerResponse(
        true,
        status,
        arg2.message,
        arg2.data,
        null,
      );
    }
    return new ControllerResponse(true, status, arg2, data, null);
  }

  static fail(error: HttpException) {
    const res = error.getResponse();

    return new ControllerResponse(
      false,
      error.getStatus(),
      error.message,
      null,
      (typeof res === 'string' ? res : res['message']) as string,
    );
  }
}
