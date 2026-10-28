import { AdminService } from './admin.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import {
  ReviewAction,
  ReportReviewReason,
  ReportAction,
} from './dto/moderation.dto';

type MockPrisma = Record<string, Record<string, jest.Mock>> & {
  $transaction: jest.Mock;
};

describe('AdminService review moderation', () => {
  let service: AdminService;
  let prisma: MockPrisma;

  beforeEach(() => {
    const $transaction = jest.fn();
    prisma = {
      $transaction,
      review: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      merchant: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      order: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      orderStatusHistory: {
        findFirst: jest.fn(),
      },
      refreshToken: {
        updateMany: jest.fn(),
      },
      reviewReport: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      notification: {
        create: jest.fn(),
        createMany: jest.fn(),
      },
      $queryRaw: jest
        .fn()
        .mockResolvedValue([{ avg_rating: 0, review_count: 0 }]),
    } as unknown as MockPrisma;

    prisma.$transaction.mockImplementation(
      async (fn: (tx: MockPrisma) => Promise<unknown>) => fn(prisma),
    );

    const redis = {
      del: jest.fn(),
      getClient: jest.fn().mockReturnValue({
        keys: jest.fn().mockResolvedValue([]),
        del: jest.fn(),
      }),
    };

    service = new AdminService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
    );
  });

  it('rejects a review with a reason and keeps it hidden', async () => {
    prisma.review.findUnique.mockResolvedValue({
      id: 'r1',
      status: 'approved',
      productId: 'p1',
    });
    prisma.review.update.mockResolvedValue({ id: 'r1', status: 'rejected' });

    const result = await service.moderateReview(
      'r1',
      { action: ReviewAction.REJECT, reason: 'Spam content' },
      'admin1',
    );

    expect(prisma.review.findUnique).toHaveBeenCalledWith({
      where: { id: 'r1' },
    });
    expect(result.status).toBe('rejected');
  });

  it('links the merchant review approval notification to its product', async () => {
    prisma.review.findUnique.mockResolvedValue({
      id: 'r1',
      status: 'pending',
      productId: 'p1',
      userId: 'buyer1',
    });
    prisma.review.update.mockResolvedValue({
      id: 'r1',
      status: 'approved',
      updatedAt: new Date('2026-10-06T00:00:00Z'),
    });
    prisma.product.findUnique.mockResolvedValue({
      name: 'Honey Lip Balm',
      merchant: { userId: 'merchant1' },
    });

    await service.moderateReview(
      'r1',
      { action: ReviewAction.APPROVE },
      'admin1',
    );

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'merchant1',
          type: 'REVIEW_APPROVED',
          title: 'New review received',
          message:
            'A new review has been approved for "Honey Lip Balm" and is now visible to shoppers.',
          entityType: 'Product',
          entityId: 'p1',
        },
        {
          userId: 'buyer1',
          type: 'REVIEW_APPROVED',
          title: 'Your review was approved',
          message:
            'Your review for "Honey Lip Balm" has been approved and is now live.',
          entityType: 'Product',
          entityId: 'p1',
        },
      ],
      skipDuplicates: true,
    });
  });

  it('creates a report record for a review', async () => {
    prisma.review.findUnique.mockResolvedValue({ id: 'r1' });
    prisma.reviewReport.findFirst.mockResolvedValue(null);
    prisma.reviewReport.create.mockResolvedValue({
      id: 'rep1',
      reviewId: 'r1',
      reason: 'spam',
      status: 'pending',
    });

    const result = await service.reportReview('r1', 'admin1', {
      reason: ReportReviewReason.SPAM,
      detail: 'Fake review',
    });

    expect(prisma.review.findUnique).toHaveBeenCalledWith({
      where: { id: 'r1' },
    });
    expect(prisma.reviewReport.create).toHaveBeenCalledWith({
      data: {
        reviewId: 'r1',
        reportedBy: 'admin1',
        reason: ReportReviewReason.SPAM,
        description: 'Fake review',
        status: 'pending',
      },
    });
    expect(result.status).toBe('pending');
  });

  it('notifies only the reporter when a report is rejected', async () => {
    prisma.reviewReport.findUnique.mockResolvedValue({
      id: 'rep1',
      reviewId: 'r1',
      reportedBy: 'buyer1',
      status: 'pending',
    });
    prisma.reviewReport.update.mockResolvedValue({
      id: 'rep1',
      status: 'rejected',
    });
    prisma.review.findUnique.mockResolvedValue({
      id: 'r1',
      productId: 'p1',
      product: {
        id: 'p1',
        name: 'Honey Lip Balm',
        merchant: { userId: 'merchant1' },
      },
    });

    await service.updateReportStatus(
      'rep1',
      { status: ReportAction.REJECTED, adminNote: 'Not a violation' },
      'admin1',
    );

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'buyer1',
          type: 'REPORT_REJECTED',
          title: 'Your review report was rejected',
          message:
            'The review you reported for "Honey Lip Balm" was rejected by our moderation team.',
          entityType: 'ReviewReport',
          entityId: 'rep1',
        },
      ],
      skipDuplicates: true,
    });
  });

  it('notifies the reporter and the product merchant when a report is resolved', async () => {
    prisma.reviewReport.findUnique.mockResolvedValue({
      id: 'rep1',
      reviewId: 'r1',
      reportedBy: 'buyer1',
      status: 'pending',
    });
    prisma.reviewReport.update.mockResolvedValue({
      id: 'rep1',
      status: 'resolved',
    });
    prisma.review.findUnique.mockResolvedValue({
      id: 'r1',
      productId: 'p1',
      product: {
        id: 'p1',
        name: 'Honey Lip Balm',
        merchant: { userId: 'merchant1' },
      },
    });
    prisma.review.update.mockResolvedValue({ id: 'r1', status: 'rejected' });

    await service.updateReportStatus(
      'rep1',
      { status: ReportAction.RESOLVED, adminNote: 'Policy violation' },
      'admin1',
    );

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'buyer1',
          type: 'REPORT_RESOLVED',
          title: 'Your review report was resolved',
          message:
            'The review you reported for "Honey Lip Balm" has been resolved by our moderation team.',
          entityType: 'ReviewReport',
          entityId: 'rep1',
        },
        {
          userId: 'merchant1',
          type: 'REPORT_RESOLVED',
          title: 'A product review was resolved',
          message:
            'A review for your product "Honey Lip Balm" was reported and has been resolved by our moderation team.',
          entityType: 'Product',
          entityId: 'p1',
        },
      ],
      skipDuplicates: true,
    });
  });

  it('throws when moderating a missing review', async () => {
    prisma.review.findUnique.mockResolvedValue(null);

    await expect(
      service.moderateReview(
        'missing',
        { action: ReviewAction.REJECT, reason: 'Bad content' },
        'admin1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  describe('user moderation', () => {
    beforeEach(() => {
      prisma.order.findFirst.mockResolvedValue(null);
      prisma.orderStatusHistory.findFirst.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue({
        id: 'u1',
        isActive: false,
        updatedAt: new Date('2026-09-23T00:00:00Z'),
      });
    });

    it('deactivates a user and stores the deactivation reason', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        roleCode: 'buyer',
        isActive: true,
      });

      const result = await service.moderateUser(
        'u1',
        { isActive: false, reason: 'Violated terms of service' },
        'admin1',
      );

      expect(result.isActive).toBe(false);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          isActive: false,
          deactivationReason: 'Violated terms of service',
        },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'admin1',
          action: 'USER_DEACTIVATED',
          entityType: 'user',
          entityId: 'u1',
          newValue: {
            isActive: false,
            reason: 'Violated terms of service',
          },
        },
      });
    });

    it('allows deactivation when the buyer has no undelivered orders', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        roleCode: 'buyer',
        isActive: true,
      });
      prisma.order.findFirst.mockResolvedValue(null);

      const result = await service.moderateUser(
        'u1',
        { isActive: false, reason: 'Account no longer needed' },
        'admin1',
      );

      expect(result.isActive).toBe(false);
      expect(prisma.order.findFirst).toHaveBeenCalledWith({
        where: {
          buyerId: 'u1',
          status: { isTerminalState: false },
        },
      });
    });

    it('blocks deactivation while the buyer has an undelivered order', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        roleCode: 'buyer',
        isActive: true,
      });
      prisma.order.findFirst.mockResolvedValue({ id: 'o1' });

      await expect(
        service.moderateUser(
          'u1',
          { isActive: false, reason: 'Account no longer needed' },
          'admin1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when deactivating without a reason', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        roleCode: 'buyer',
        isActive: true,
      });

      await expect(
        service.moderateUser('u1', { isActive: false }, 'admin1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when deactivating your own account', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'admin1',
        roleCode: 'admin',
        isActive: true,
      });

      await expect(
        service.moderateUser(
          'admin1',
          { isActive: false, reason: 'Reason' },
          'admin1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when the user is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.moderateUser(
          'missing',
          { isActive: false, reason: 'Reason' },
          'admin1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('reactivates a user without a reason', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        roleCode: 'buyer',
        isActive: false,
      });
      prisma.user.update.mockResolvedValue({
        id: 'u1',
        isActive: true,
        updatedAt: new Date('2026-09-23T00:00:00Z'),
      });

      const result = await service.moderateUser(
        'u1',
        { isActive: true },
        'admin1',
      );

      expect(result.isActive).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { isActive: true },
      });
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'admin1',
          action: 'USER_ACTIVATED',
          entityType: 'user',
          entityId: 'u1',
          newValue: { isActive: true },
        },
      });
    });
  });

  describe('product moderation', () => {
    beforeEach(() => {
      prisma.order.findFirst.mockResolvedValue(null);
    });

    it('sends a merchant notification when an admin deactivates a product', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        name: 'Glow Serum',
        merchantId: 'm1',
        isActive: true,
      });
      prisma.product.update.mockResolvedValue({
        id: 'p1',
        name: 'Glow Serum',
        isActive: false,
        updatedAt: new Date('2026-09-23T00:00:00Z'),
      });
      prisma.merchant.findUnique.mockResolvedValue({
        id: 'm1',
        userId: 'merchant-user-1',
      });

      const result = await service.moderateProduct(
        'p1',
        { isActive: false, reason: 'Policy violation' },
        'admin1',
      );

      expect(result.isActive).toBe(false);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'merchant-user-1',
          type: 'PRODUCT_DEACTIVATED',
          title: 'Product Deactivated',
          message:
            'Your product "Glow Serum" has been deactivated by an administrator. Reason: Policy violation',
          entityType: 'product',
          entityId: 'p1',
        },
      });
    });

    it('sends a merchant notification when an admin reactivates a product', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        name: 'Glow Serum',
        merchantId: 'm1',
        isActive: false,
      });
      prisma.product.update.mockResolvedValue({
        id: 'p1',
        name: 'Glow Serum',
        isActive: true,
        updatedAt: new Date('2026-09-23T00:00:00Z'),
      });
      prisma.merchant.findUnique.mockResolvedValue({
        id: 'm1',
        userId: 'merchant-user-1',
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'merchant-user-1',
        isActive: true,
      });

      const result = await service.moderateProduct(
        'p1',
        { isActive: true },
        'admin1',
      );

      expect(result.isActive).toBe(true);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'merchant-user-1',
          type: 'PRODUCT_REACTIVATED',
          title: 'Product Reactivated',
          message:
            'Your product "Glow Serum" is active again and is now available to shoppers.',
          entityType: 'product',
          entityId: 'p1',
        },
      });
    });

    it('blocks deactivation while the product has an undelivered order', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        name: 'Glow Serum',
        merchantId: 'm1',
        isActive: true,
      });
      prisma.order.findFirst.mockResolvedValue({ id: 'o1' });

      await expect(
        service.moderateProduct(
          'p1',
          { isActive: false, reason: 'Policy violation' },
          'admin1',
        ),
      ).rejects.toThrow(
        'Cannot deactivate until the order delivery is completed.',
      );

      expect(prisma.order.findFirst).toHaveBeenCalledWith({
        where: {
          items: { some: { productId: 'p1' } },
          status: { isTerminalState: false },
        },
        select: { id: true },
      });
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('allows deactivation once all orders for the product are delivered', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        name: 'Glow Serum',
        merchantId: 'm1',
        isActive: true,
      });
      prisma.product.update.mockResolvedValue({
        id: 'p1',
        isActive: false,
        updatedAt: new Date('2026-09-23T00:00:00Z'),
      });
      prisma.merchant.findUnique.mockResolvedValue({
        id: 'm1',
        userId: 'merchant-user-1',
      });
      prisma.order.findFirst.mockResolvedValue(null);

      const result = await service.moderateProduct(
        'p1',
        { isActive: false, reason: 'Policy violation' },
        'admin1',
      );

      expect(result.isActive).toBe(false);
      expect(prisma.order.findFirst).toHaveBeenCalledWith({
        where: {
          items: { some: { productId: 'p1' } },
          status: { isTerminalState: false },
        },
        select: { id: true },
      });
    });

    it('flags products with undelivered orders in getProducts', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Persa-Gel', isActive: true },
        { id: 'p2', name: 'COSRX Serum', isActive: true },
      ]);
      prisma.product.count.mockResolvedValue(2);
      prisma.order.findMany.mockResolvedValue([
        { items: [{ productId: 'p1' }] },
      ]);

      const result = await service.getProducts({});

      expect(result.items).toHaveLength(2);
      expect(result.items[0].hasPendingOrders).toBe(true);
      expect(result.items[1].hasPendingOrders).toBe(false);
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {
          items: { some: { productId: { in: ['p1', 'p2'] } } },
          status: { isTerminalState: false },
        },
        select: {
          items: {
            where: { productId: { in: ['p1', 'p2'] } },
            select: { productId: true },
          },
        },
      });
    });

    it('returns hasPendingOrders false in getProductById when all orders are delivered', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        name: 'Glow Serum',
        merchantId: 'm1',
        isActive: true,
      });
      prisma.order.findFirst.mockResolvedValue(null);

      const result = await service.getProductById('p1');

      expect(result.hasPendingOrders).toBe(false);
    });
  });
});
