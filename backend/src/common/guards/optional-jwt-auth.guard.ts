import { ExecutionContext, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * Runs JWT authentication when an Authorization header is present, but lets
 * anonymous requests through with `request.user` left undefined.
 */
@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
  canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string } }>();

    if (!request.headers.authorization) {
      return true;
    }

    return super.canActivate(context);
  }
}
