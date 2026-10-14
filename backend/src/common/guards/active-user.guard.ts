import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuthUser } from '../decorators/current-user.decorator';

@Injectable()
export class ActiveUserGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const { user } = request;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { isActive: true },
    });

    if (!dbUser) {
      throw new ForbiddenException('Access denied');
    }

    if (!dbUser.isActive) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'ACCOUNT_DEACTIVATED',
        message: 'Your account is deactivated.',
      });
    }

    return true;
  }
}
