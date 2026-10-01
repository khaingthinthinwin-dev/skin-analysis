import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class MerchantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: { licenseStatus?: string } = status
      ? { licenseStatus: status }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.merchant.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      }),
      this.prisma.merchant.count({ where }),
    ]);

    return {
      items,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  async findOne(id: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (!merchant) {
      throw new NotFoundException(`Merchant with ID ${id} not found`);
    }

    return merchant;
  }

  async approve(id: string, adminId: string) {
    const merchant = await this.findOne(id);

    const updated = await this.prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        licenseStatus: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });

    // In-app notification so the merchant is alerted of approval.
    // Failures must never break the approval flow.
    try {
      await this.prisma.notification.create({
        data: {
          userId: merchant.userId,
          type: 'MERCHANT_STATUS_CHANGED',
          title: 'Merchant Approved',
          message: `Your shop "${merchant.shopName}" has been approved. You can now list products.`,
          entityType: 'merchant',
          entityId: merchant.id,
        },
      });
    } catch {
      // noop: notification is best-effort
    }

    return updated;
  }

  async reject(id: string, adminId: string, reason: string) {
    const merchant = await this.findOne(id);

    const updated = await this.prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        licenseStatus: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // In-app notification so the merchant is alerted of rejection.
    try {
      await this.prisma.notification.create({
        data: {
          userId: merchant.userId,
          type: 'MERCHANT_STATUS_CHANGED',
          title: 'Merchant Rejected',
          message: `Your business license has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
          entityType: 'merchant',
          entityId: merchant.id,
        },
      });
    } catch {
      // noop: notification is best-effort
    }

    return updated;
  }
}
