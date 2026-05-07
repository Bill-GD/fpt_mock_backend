export class Result<T> {
  private constructor(
    readonly success: boolean,
    readonly message: string,
    readonly data: T,
  ) {}

  static ok<T>(message: string, data: T) {
    return new Result(true, message, data);
  }

  static fail(message: string) {
    return new Result(false, message, null);
  }
}
