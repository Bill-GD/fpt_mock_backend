export class Result<T> {
  success: boolean;
  message: string;
  data: T;

  private constructor(success: boolean, message: string, data: T) {
    this.success = success;
    this.message = message;
    this.data = data;
  }

  static ok<T>(message: string, data: T) {
    return new Result(true, message, data);
  }

  static fail(message: string) {
    return new Result(false, message, null);
  }
}
