import { AdminService } from './admin.service';
import { NotFoundException } from '@nestjs/common';
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
      isApproved: true,
      productId: 'p1',
    });
    prisma.review.update.mockResolvedValue({ id: 'r1', isApproved: false });

    const result = await service.moderateReview(
      'r1',
      { action: ReviewAction.REJECT, reason: 'Spam content' },
      'admin1',
    );

    expect(prisma.review.findUnique).toHaveBeenCalledWith({
      where: { id: 'r1' },
    });
    expect(result.isApproved).toBe(false);
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
});
