import { AdminService } from './admin.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { ReviewAction, ReportReviewReason } from './dto/moderation.dto';

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
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      merchant: {
        findFirst: jest.fn(),
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
});
