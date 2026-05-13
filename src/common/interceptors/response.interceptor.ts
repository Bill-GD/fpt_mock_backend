import { ControllerResponse } from '@/common/utils/controller-response';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { map, Observable } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();

    // ignore sse
    if (response.getHeader('Content-Type') === 'text/event-stream') {
      return next.handle();
    }

    return next.handle().pipe(
      map((res): any => {
        const typed = res as ControllerResponse;
        response.status(typed.status);
        return res;
      }),
    );
  }
}
