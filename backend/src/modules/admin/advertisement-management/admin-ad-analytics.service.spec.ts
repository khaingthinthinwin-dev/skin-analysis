import { AdminAdManagementService } from './admin-ad-management.service';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';

type MockPrisma = Record<string, Record<string, jest.Mock>> & {
  $transaction: jest.Mock;
  $queryRaw: jest.Mock;
};

describe('AdminAdManagementService revenue analytics', () => {
  let service: AdminAdManagementService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      $queryRaw: jest.fn(),
      advertisement: {},
      adPayment: {},
      notification: {},
      auditLog: {},
      adFeeSetting: {},
      adFeeHistory: {},
    } as unknown as MockPrisma;

    service = new AdminAdManagementService(
      prisma as unknown as PrismaService,
      {} as RedisService,
    );
  });

  it('rejects a date range where dateTo is before dateFrom', async () => {
    await expect(
      service.getRevenueAnalytics({
        dateFrom: '2024-06-10',
        dateTo: '2024-06-01',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a date range longer than 365 days', async () => {
    await expect(
      service.getRevenueAnalytics({
        dateFrom: '2023-01-01',
        dateTo: '2024-06-01',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('aggregates revenue by placement, tier and daily trend', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          payment_amount: new Prisma.Decimal('50.00'),
          placement: 'homepage_banner',
          tier: 'premium',
          approved_at: new Date('2024-06-01T00:00:00.000Z'),
        },
        {
          payment_amount: new Prisma.Decimal('30.00'),
          placement: 'product_sidebar',
          tier: 'basic',
          approved_at: new Date('2024-06-02T00:00:00.000Z'),
        },
        {
          payment_amount: new Prisma.Decimal('20.00'),
          placement: 'homepage_banner',
          tier: 'standard',
          approved_at: new Date('2024-06-01T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        { refund_count: 1, refund_amount: new Prisma.Decimal('10.00') },
      ]);

    const result = await service.getRevenueAnalytics({
      dateFrom: '2024-06-01',
      dateTo: '2024-06-02',
    });

    expect(result.summary).toEqual({
      totalRevenue: 100,
      totalAdsApproved: 3,
      totalFeesCollected: 90,
      avgRevenuePerAd: 33.33,
      totalRefunds: 1,
    });

    expect(result.byPlacement).toHaveLength(2);
    expect(result.byPlacement[0]).toEqual(
      expect.objectContaining({
        placement: 'homepage_banner',
        placementName: 'Homepage Banner',
        adCount: 2,
        revenue: 70,
        avgCtr: 0,
      }),
    );

    expect(result.byTier).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tier: 'premium',
          tierName: 'Premium',
          adCount: 1,
          revenue: 50,
          avgCtr: 0,
        }),
      ]),
    );

    expect(result.trend).toEqual([
      {
        date: '2024-06-01',
        revenue: 70,
        adCount: 2,
      },
      {
        date: '2024-06-02',
        revenue: 30,
        adCount: 1,
      },
    ]);
  });

  it('returns zeros fallback when there are no approved ads in range', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ refund_count: 0, refund_amount: null }]);

    const result = await service.getRevenueAnalytics({
      dateFrom: '2024-06-01',
      dateTo: '2024-06-02',
    });

    expect(result.summary).toEqual({
      totalRevenue: 0,
      totalAdsApproved: 0,
      totalFeesCollected: 0,
      avgRevenuePerAd: 0,
      totalRefunds: 0,
    });
    expect(result.byPlacement).toEqual([]);
    expect(result.byTier).toEqual([]);
    expect(result.trend).toEqual([]);
  });
});
