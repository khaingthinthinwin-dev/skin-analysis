import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response as ExpressResponse } from 'express';

export interface Response<T> {
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T> | T
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T> | T> {
    const httpResponse: ExpressResponse = context.switchToHttp().getResponse();
    // Skip { data } wrapping for already-streamed responses (@Res() CSV
    // exports send the body directly via res), otherwise the transform
    // would fail on a sent response or JSON-wrap binary content.
    return next.handle().pipe(
      map((data: T) => {
        if (httpResponse.headersSent || httpResponse.writableEnded) {
          return data;
        }
        return { data };
      }),
    );
  }
}
