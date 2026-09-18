/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { AdminAdManagementService } from './admin-ad-management.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';

type MockPrisma = Record<string, Record<string, jest.Mock>> & {
  $transaction: jest.Mock;
};

describe('AdminAdManagementService ad review', () => {
  let service: AdminAdManagementService;
  let prisma: MockPrisma;
  let redis: { del: jest.Mock };

  const feeSetting = {
    id: 'fs1',
    placement: 'homepage_banner',
    tier: 'premium',
    dailyRate: new Prisma.Decimal('10.00'),
    durationDays: 5,
    maxAds: 3,
    isActive: true,
    createdAt: new Date('2024-06-01T00:00:00.000Z'),
    updatedAt: new Date('2024-06-01T00:00:00.000Z'),
  };

  const listingAd = {
    id: 'a1',
    shopId: 's1',
    shop: { id: 's1', name: 'Shop A' },
    feeSetting,
    title: 'Buy now',
    announcementMessage: 'msg',
    content: null,
    imageUrl: null,
    linkUrl: null,
    isActive: true,
    approvalStatus: 'pending',
    paymentStatus: 'completed',
    paymentAmount: new Prisma.Decimal('50.00'),
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    startsAt: null,
    expiresAt: null,
    weekNumber: null,
    createdAt: new Date('2024-06-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    const $transaction = jest.fn();
    prisma = {
      $transaction,
      advertisement: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      adPayment: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      notification: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      adFeeSetting: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      adFeeHistory: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
    } as unknown as MockPrisma;

    prisma.$transaction.mockImplementation(
      async (fn: (tx: MockPrisma) => Promise<unknown>) => fn(prisma),
    );

    redis = { del: jest.fn() };

    service = new AdminAdManagementService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
    );
  });

  it('lists ads with pagination meta and resolves placement/tier via feeSetting', async () => {
    prisma.advertisement.findMany.mockResolvedValue([listingAd]);
    prisma.advertisement.count.mockResolvedValue(1);

    const result = await service.listAds({
      page: 1,
      limit: 20,
      status: 'pending',
      placement: 'homepage_banner',
    });

    expect(result.data[0].shopName).toBe('Shop A');
    expect(result.data[0].placement).toBe('homepage_banner');
    expect(result.data[0].tier).toBe('premium');
    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    expect(prisma.advertisement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          approvalStatus: 'pending',
          feeSetting: { placement: 'homepage_banner' },
        }),
      }),
    );
  });

  it('returns 404 for a missing advertisement detail', async () => {
    prisma.advertisement.findUnique.mockResolvedValue(null);

    await expect(service.viewAdDetail('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns detail with analytics zeros and computed feeInfo', async () => {
    prisma.advertisement.findUnique.mockResolvedValue({
      ...listingAd,
      adPayments: [
        {
          paymentStatus: 'completed',
          amount: new Prisma.Decimal('50.00'),
          paidAt: new Date('2024-06-01T00:00:00.000Z'),
        },
      ],
    });

    const result = await service.viewAdDetail('a1');

    expect(result.analytics).toEqual({ impressions: 0, clicks: 0, ctr: 0 });
    expect(result.feeInfo).toEqual({
      dailyRate: '10.00',
      durationDays: 5,
      totalFee: '50.00',
    });
    expect(result.paymentInfo.amount).toBe('50.00');
  });

  it('approves a pending ad, notifies the owner and invalidates cache', async () => {
    prisma.advertisement.findUnique.mockResolvedValue({
      id: 'a1',
      shopId: 's1',
      title: 'Buy now',
      approvalStatus: 'pending',
      createdAt: new Date('2024-06-01T00:00:00.000Z'),
      shop: { userId: 'u_seller', name: 'Shop A' },
    });
    prisma.advertisement.update.mockResolvedValue({
      id: 'a1',
      approvalStatus: 'approved',
      approvedBy: 'admin1',
      approvedAt: new Date('2024-06-02T00:00:00.000Z'),
      createdAt: new Date('2024-06-01T00:00:00.000Z'),
    });

    const result = await service.approveAd('a1', 'admin1');

    expect(result.approvalStatus).toBe('approved');
    expect(prisma.advertisement.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: expect.objectContaining({
        approvalStatus: 'approved',
        approvedBy: 'admin1',
        approvedAt: expect.any(Date),
      }),
    });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u_seller',
        type: 'AD_APPROVED',
        entityType: 'Advertisement',
        entityId: 'a1',
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'AD_APPROVED',
        userId: 'admin1',
      }),
    });
    expect(redis.del).toHaveBeenCalledWith('cache:ads:active');
  });

  it('refuses to approve a non-pending ad', async () => {
    prisma.advertisement.findUnique.mockResolvedValue({
      id: 'a1',
      shopId: 's1',
      title: 'x',
      approvalStatus: 'approved',
      shop: { userId: 'u', name: 'S' },
    });

    await expect(service.approveAd('a1', 'admin1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects an ad and refunds its completed payment inside the transaction', async () => {
    prisma.advertisement.findUnique.mockResolvedValue({
      id: 'a1',
      shopId: 's1',
      title: 'Buy now',
      approvalStatus: 'pending',
      paymentStatus: 'completed',
      createdAt: new Date('2024-06-01T00:00:00.000Z'),
      shop: { userId: 'u_seller', name: 'Shop A' },
    });
    prisma.adPayment.findMany.mockResolvedValue([
      { id: 'p1', amount: new Prisma.Decimal('50.00') },
    ]);
    prisma.adPayment.update.mockResolvedValue({});
    prisma.advertisement.update.mockResolvedValue({
      id: 'a1',
      approvalStatus: 'rejected',
      approvedBy: 'admin1',
      approvedAt: new Date('2024-06-02T00:00:00.000Z'),
      rejectionReason: 'Bad content',
      paymentStatus: 'refunded',
      createdAt: new Date('2024-06-01T00:00:00.000Z'),
    });

    const result = await service.rejectAd(
      'a1',
      { rejection_reason: 'Bad content' },
      'admin1',
    );

    expect(result.approvalStatus).toBe('rejected');
    expect(result.rejectionReason).toBe('Bad content');
    expect(prisma.adPayment.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: expect.objectContaining({
        paymentStatus: 'refunded',
        refundAmount: expect.any(Prisma.Decimal),
        refundReason: 'Bad content',
        refundedAt: expect.any(Date),
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'AD_REJECTED',
        newValue: expect.objectContaining({ refundAmount: '50.00' }),
      }),
    });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'AD_REJECTED',
        userId: 'u_seller',
      }),
    });
    expect(redis.del).toHaveBeenCalledWith('cache:ads:active');
  });

  it('bulk approves pending ads in a single batch', async () => {
    prisma.advertisement.findMany.mockResolvedValue([
      {
        id: 'a1',
        shopId: 's1',
        title: 'A',
        approvalStatus: 'pending',
        shop: { userId: 'u1' },
      },
      {
        id: 'a2',
        shopId: 's2',
        title: 'B',
        approvalStatus: 'pending',
        shop: { userId: 'u2' },
      },
    ]);
    prisma.advertisement.updateMany.mockResolvedValue({ count: 2 });
    prisma.notification.create.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});

    const result = await service.bulkApproveAds(
      { ad_ids: ['a1', 'a2'] },
      'admin1',
    );

    expect(result.approved).toBe(2);
    expect(result.failed).toBe(0);
    expect(prisma.advertisement.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a1', 'a2'] } },
      data: expect.objectContaining({ approvalStatus: 'approved' }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'BULK_AD_APPROVED' }),
    });
  });

  it('bulk approve rejects when an ad is not pending', async () => {
    prisma.advertisement.findMany.mockResolvedValue([
      {
        id: 'a1',
        shopId: 's1',
        title: 'A',
        approvalStatus: 'approved',
        shop: { userId: 'u1' },
      },
    ]);

    await expect(
      service.bulkApproveAds({ ad_ids: ['a1'] }, 'admin1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('bulk rejects ads and refunds completed payments sequentially', async () => {
    prisma.advertisement.findMany.mockResolvedValue([
      {
        id: 'a1',
        shopId: 's1',
        title: 'A',
        approvalStatus: 'pending',
        shop: { userId: 'u1' },
      },
      {
        id: 'a2',
        shopId: 's2',
        title: 'B',
        approvalStatus: 'pending',
        shop: { userId: 'u2' },
      },
    ]);
    prisma.advertisement.updateMany.mockResolvedValue({ count: 2 });
    prisma.adPayment.findFirst
      .mockResolvedValueOnce({ id: 'p1', amount: new Prisma.Decimal('50.00') })
      .mockResolvedValueOnce(null);
    prisma.adPayment.update.mockResolvedValue({});
    prisma.advertisement.update.mockResolvedValue({});
    prisma.notification.create.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});

    const result = await service.bulkRejectAds(
      { ad_ids: ['a1', 'a2'], rejection_reason: 'spam' },
      'admin1',
    );

    expect(result.rejected).toBe(2);
    expect(result.refundsProcessed).toBe(2);
    expect(result.refundsFailed).toBe(0);
    expect(result.results[0].refundStatus).toBe('processed');
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'BULK_AD_REJECTED' }),
    });
  });

  it('bulk reject logs refund failures and continues', async () => {
    prisma.advertisement.findMany.mockResolvedValue([
      {
        id: 'a1',
        shopId: 's1',
        title: 'A',
        approvalStatus: 'pending',
        shop: { userId: 'u1' },
      },
    ]);
    prisma.advertisement.updateMany.mockResolvedValue({ count: 1 });
    prisma.adPayment.findFirst.mockRejectedValue(new Error('boom'));
    prisma.notification.create.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});

    const result = await service.bulkRejectAds(
      { ad_ids: ['a1'], rejection_reason: 'spam' },
      'admin1',
    );

    expect(result.rejected).toBe(1);
    expect(result.refundsFailed).toBe(1);
    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(result.results[0].refundStatus).toBe('failed');
  });
});
