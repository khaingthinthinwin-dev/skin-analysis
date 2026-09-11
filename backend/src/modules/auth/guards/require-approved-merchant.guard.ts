import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AuthUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class RequireApprovedMerchantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const { user } = request;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    if (user.roleCode === 'admin' || user.roleCode === 'super_admin') {
      return true;
    }

    if (user.roleCode !== 'merchant') {
      throw new ForbiddenException('Access denied');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { userId: user.id },
      select: { licenseStatus: true, rejectionReason: true },
    });

    if (!merchant) {
      throw new ForbiddenException('Merchant profile not found');
    }

    if (merchant.licenseStatus === 'approved') {
      return true;
    }

    if (merchant.licenseStatus === 'pending') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'MERCHANT_NOT_APPROVED',
        message:
          'Your merchant account is pending approval. This operation is restricted until your license is approved.',
      });
    }

    if (merchant.licenseStatus === 'rejected') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'MERCHANT_REJECTED',
        message: `Your account has been rejected. Reason: ${merchant.rejectionReason || 'No reason provided'}`,
      });
    }

    throw new ForbiddenException('Access denied');
  }
}
