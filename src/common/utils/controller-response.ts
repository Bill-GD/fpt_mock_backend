import { HttpException, HttpStatus } from '@nestjs/common';

export class ControllerResponse<T = null> {
  readonly success: boolean;

  readonly message: string;

  readonly status: number;

  readonly error: string | null;

  readonly data: T;

  private constructor(
    success: boolean,
    status: number,
    message: string,
    data: T,
    error: string | null,
  ) {
    this.message = message;
    this.data = data;
    this.error = error;
    this.status = status;
    this.success = success;
  }

  static ok<T>(status: HttpStatus, message: string, data: T) {
    return new ControllerResponse(true, status, message, data, null);
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
