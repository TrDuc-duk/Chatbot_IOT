import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Response format chuẩn
 */
export interface Response<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

/**
 * Transform Interceptor
 *
 * Wrap tất cả response thành format chuẩn:
 * {
 *   success: true,
 *   data: { ... },
 *   timestamp: "2024-01-01T00:00:00.000Z"
 * }
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data: data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
