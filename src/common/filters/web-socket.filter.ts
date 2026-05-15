import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';

@Catch()
export class WebSocketFilter extends BaseWsExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    console.log(error);
    super.catch(error, host);
  }
}
