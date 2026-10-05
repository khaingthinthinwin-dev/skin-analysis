import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { MerchantSummaryService } from './merchant-summary.service';
import { ORDER_INSIGHTS_CONFIG } from './order-insights.config';
import { SummaryQueryDto } from './dto/summary-query.dto';

const merchantUser: AuthUser = {
  id: 'user-m1',
  email: 'merchant@example.com',
  roleCode: 'merchant',
};

const adminUser: AuthUser = {
  id: 'user-admin',
  email: 'admin@example.com',
  roleCode: 'admin',
};

const approvedMerchant = {
  id: 'merchant-1',
  licenseStatus: 'approved',
};

const otherMerchantId = 'merchant-2';

const makeQuery = (overrides: Partial<SummaryQueryDto> = {}): SummaryQueryDto =>
  Object.assign(new SummaryQueryDto(), overrides);

const objectContaining = <T extends object>(
  value: T,
): jest.AsymmetricMatcher => {
  const matcher: unknown = expect.objectContaining(value);
  return matcher as jest.AsymmetricMatcher;
};

describe('MerchantSummaryService', () => {
  const prisma = {
    merchant: { findUnique: jest.fn() },
    order: { count: jest.fn(), findMany: jest.fn() },
    commissionSetting: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    checkRateLimit: jest.fn(),
    getClient: jest.fn(),
  };

  let service: MerchantSummaryService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.merchant.findUnique.mockResolvedValue(approvedMerchant);
    prisma.order.count.mockResolvedValue(0);
    prisma.order.findMany.mockResolvedValue([]);
    prisma.commissionSetting.findFirst.mockResolvedValue({
      commissionRate: new Prisma.Decimal('12.00'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue(undefined);
    redis.del.mockResolvedValue(undefined);
    redis.checkRateLimit.mockResolvedValue(true);
    redis.getClient.mockReturnValue(null);
    service = new MerchantSummaryService(prisma as never, redis as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getSalesSummary', () => {
    it('returns the three counters together on cache MISS', async () => {
      prisma.order.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(28)
        .mockResolvedValueOnce(112);

      await expect(service.getSalesSummary(merchantUser, {})).resolves.toEqual({
        salesSummary: {
          todayCount: 3,
          thisMonthCount: 28,
          completedCount: 112,
        },
      });
      expect(prisma.order.count).toHaveBeenCalledTimes(3);
    });

    it('uses UTC day and month boundaries including 23:59:59Z and 00:00:00Z edges', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-15T23:59:59.000Z'));

      await service.getSalesSummary(merchantUser, {});

      expect(prisma.order.count).toHaveBeenNthCalledWith(1, {
        where: {
          merchantId: 'merchant-1',
          createdAt: {
            gte: new Date('2026-03-15T00:00:00.000Z'),
            lt: new Date('2026-03-16T00:00:00.000Z'),
          },
        },
      });
      expect(prisma.order.count).toHaveBeenNthCalledWith(2, {
        where: {
          merchantId: 'merchant-1',
          createdAt: {
            gte: new Date('2026-03-01T00:00:00.000Z'),
            lt: new Date('2026-04-01T00:00:00.000Z'),
          },
        },
      });

      jest.setSystemTime(new Date('2026-03-16T00:00:00.000Z'));
      prisma.order.count.mockClear();
      await service.getSalesSummary(merchantUser, {});

      expect(prisma.order.count).toHaveBeenNthCalledWith(1, {
        where: {
          merchantId: 'merchant-1',
          createdAt: {
            gte: new Date('2026-03-16T00:00:00.000Z'),
            lt: new Date('2026-03-17T00:00:00.000Z'),
          },
        },
      });
    });

    it("counts completed orders only with statusCode 'delivered'", async () => {
      await service.getSalesSummary(merchantUser, {});

      expect(prisma.order.count).toHaveBeenNthCalledWith(3, {
        where: { merchantId: 'merchant-1', statusCode: 'delivered' },
      });
    });

    it('returns the cached summary on HIT without querying orders', async () => {
      const cached = {
        salesSummary: {
          todayCount: 9,
          thisMonthCount: 9,
          completedCount: 9,
        },
      };
      redis.get.mockResolvedValue(JSON.stringify(cached));

      await expect(service.getSalesSummary(merchantUser, {})).resolves.toEqual(
        cached,
      );
      expect(prisma.order.count).not.toHaveBeenCalled();
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('seeds the cache with the configured TTL on MISS', async () => {
      prisma.order.count.mockResolvedValue(1);

      await service.getSalesSummary(merchantUser, {});

      expect(redis.set).toHaveBeenCalledWith(
        'cache:oi:merchant:merchant-1:summary:sales',
        JSON.stringify({
          salesSummary: {
            todayCount: 1,
            thisMonthCount: 1,
            completedCount: 1,
          },
        }),
        ORDER_INSIGHTS_CONFIG.summaryCacheTtlSeconds,
      );
    });

    it('still computes when Redis is down', async () => {
      redis.get.mockResolvedValue(null);
      prisma.order.count.mockResolvedValue(2);

      await expect(service.getSalesSummary(merchantUser, {})).resolves.toEqual({
        salesSummary: {
          todayCount: 2,
          thisMonthCount: 2,
          completedCount: 2,
        },
      });
    });

    it('ignores a merchant-supplied merchantId and scopes to the JWT merchant', async () => {
      await service.getSalesSummary(merchantUser, {
        merchantId: otherMerchantId,
      });

      expect(prisma.merchant.findUnique).toHaveBeenCalledWith({
        where: { userId: merchantUser.id },
      });
      expect(prisma.order.count).toHaveBeenCalledWith(
        objectContaining({
          where: objectContaining({ merchantId: 'merchant-1' }),
        }),
      );
      expect(prisma.order.count).not.toHaveBeenCalledWith(
        objectContaining({
          where: objectContaining({ merchantId: otherMerchantId }),
        }),
      );
    });

    it('lets admin target a shop by merchantId and skips the license gate', async () => {
      await service.getSalesSummary(adminUser, { merchantId: otherMerchantId });

      expect(prisma.merchant.findUnique).not.toHaveBeenCalled();
      expect(prisma.order.count).toHaveBeenCalledWith(
        objectContaining({
          where: objectContaining({ merchantId: otherMerchantId }),
        }),
      );
    });

    it('aggregates all platform orders when admin omits merchantId', async () => {
      await service.getSalesSummary(adminUser, {});

      expect(prisma.order.count).toHaveBeenCalledWith({
        where: {
          createdAt: expect.any(Object) as { gte: Date; lt: Date },
        },
      });
      expect(redis.set).toHaveBeenCalledWith(
        'cache:oi:merchant:all:summary:sales',
        expect.any(String),
        ORDER_INSIGHTS_CONFIG.summaryCacheTtlSeconds,
      );
    });

    it('rejects an unapproved merchant', async () => {
      prisma.merchant.findUnique.mockResolvedValue({
        id: 'merchant-1',
        licenseStatus: 'pending',
      });

      await expect(service.getSalesSummary(merchantUser, {})).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.getSalesSummary(merchantUser, {})).rejects.toThrow(
        'Your merchant account is not approved',
      );
      expect(prisma.order.count).not.toHaveBeenCalled();
    });

    it('rejects a merchant without a profile', async () => {
      prisma.merchant.findUnique.mockResolvedValue(null);

      await expect(service.getSalesSummary(merchantUser, {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('writes MERCHANT_SUMMARY_VIEWED and does not throw when audit fails', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      prisma.auditLog.create.mockRejectedValue(new Error('audit down'));
      prisma.order.count.mockResolvedValue(0);

      await expect(
        service.getSalesSummary(merchantUser, {}),
      ).resolves.toBeDefined();

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: merchantUser.id,
          action: 'MERCHANT_SUMMARY_VIEWED',
          entityType: 'order_insights',
          entityId: 'merchant-1',
          newValue: { summaryType: 'sales' },
        },
      });
      await Promise.resolve();
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('getRevenueSummary', () => {
    it('computes the worked example (1000 / 120 / 880 / 88)', async () => {
      prisma.order.findMany.mockResolvedValue(
        Array.from({ length: 10 }, () => ({
          totalAmount: new Prisma.Decimal('100.00'),
        })),
      );

      const result = await service.getRevenueSummary(merchantUser, makeQuery());

      expect(result.revenueSummary).toMatchObject({
        sales: '1000.00',
        commission: '120.00',
        revenue: '880.00',
        aov: '88.00',
        orderCount: 10,
      });
      expect(result.revenueSummary.aov).not.toBe('100.00');
    });

    it('uses net revenue as the AOV numerator', async () => {
      prisma.order.findMany.mockResolvedValue(
        Array.from({ length: 10 }, () => ({
          totalAmount: new Prisma.Decimal('100.00'),
        })),
      );

      const { revenueSummary } = await service.getRevenueSummary(
        merchantUser,
        makeQuery(),
      );
      expect(revenueSummary.aov).toBe('88.00');
    });

    it('rounds commission per order before summing', async () => {
      prisma.order.findMany.mockResolvedValue(
        Array.from({ length: 10 }, () => ({
          totalAmount: new Prisma.Decimal('0.10'),
        })),
      );

      const { revenueSummary } = await service.getRevenueSummary(
        merchantUser,
        makeQuery(),
      );

      expect(revenueSummary.sales).toBe('1.00');
      expect(revenueSummary.commission).toBe('0.10');
      expect(revenueSummary.revenue).toBe('0.90');
    });

    it('returns zeros and aov 0.00 when there are no orders', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      await expect(
        service.getRevenueSummary(merchantUser, makeQuery()),
      ).resolves.toMatchObject({
        revenueSummary: {
          sales: '0.00',
          commission: '0.00',
          revenue: '0.00',
          aov: '0.00',
          orderCount: 0,
        },
      });
    });

    it('loads in-scope orders once for the revenue window', async () => {
      await service.getRevenueSummary(merchantUser, makeQuery());
      expect(prisma.order.findMany).toHaveBeenCalledTimes(1);
    });

    it('applies today, this_month, and last_month UTC windows', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-15T12:00:00.000Z'));

      await service.getRevenueSummary(
        merchantUser,
        makeQuery({ period: 'today' }),
      );
      expect(prisma.order.findMany).toHaveBeenLastCalledWith({
        where: {
          merchantId: 'merchant-1',
          createdAt: {
            gte: new Date('2026-03-15T00:00:00.000Z'),
            lt: new Date('2026-03-16T00:00:00.000Z'),
          },
        },
        select: { totalAmount: true },
      });

      await service.getRevenueSummary(
        merchantUser,
        makeQuery({ period: 'this_month' }),
      );
      expect(prisma.order.findMany).toHaveBeenLastCalledWith({
        where: {
          merchantId: 'merchant-1',
          createdAt: {
            gte: new Date('2026-03-01T00:00:00.000Z'),
            lt: new Date('2026-04-01T00:00:00.000Z'),
          },
        },
        select: { totalAmount: true },
      });

      await service.getRevenueSummary(
        merchantUser,
        makeQuery({ period: 'last_month' }),
      );
      expect(prisma.order.findMany).toHaveBeenLastCalledWith({
        where: {
          merchantId: 'merchant-1',
          createdAt: {
            gte: new Date('2026-02-01T00:00:00.000Z'),
            lt: new Date('2026-03-01T00:00:00.000Z'),
          },
        },
        select: { totalAmount: true },
      });
    });

    it('includes the custom `to` day in the half-open window', async () => {
      await service.getRevenueSummary(
        merchantUser,
        makeQuery({
          period: 'custom',
          from: '2026-08-01',
          to: '2026-08-31',
        }),
      );

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {
          merchantId: 'merchant-1',
          createdAt: {
            gte: new Date('2026-08-01T00:00:00.000Z'),
            lt: new Date('2026-09-01T00:00:00.000Z'),
          },
        },
        select: { totalAmount: true },
      });
    });

    it('throws 422 when custom is missing from/to', async () => {
      await expect(
        service.getRevenueSummary(
          merchantUser,
          makeQuery({ period: 'custom' }),
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);

      await expect(
        service.getRevenueSummary(
          merchantUser,
          makeQuery({ period: 'custom' }),
        ),
      ).rejects.toThrow('Select a start and end date');
    });

    it('throws 422 when custom to is before from', async () => {
      await expect(
        service.getRevenueSummary(
          merchantUser,
          makeQuery({
            period: 'custom',
            from: '2026-08-31',
            to: '2026-08-01',
          }),
        ),
      ).rejects.toThrow('Select a start and end date');
    });

    it('always reports current_settings and unlocked rate', async () => {
      const { revenueSummary } = await service.getRevenueSummary(
        merchantUser,
        makeQuery(),
      );
      expect(revenueSummary.commissionRateSource).toBe('current_settings');
      expect(revenueSummary.commissionRateLocked).toBe(false);
    });

    it("falls back to default commission rate '12.00' when no setting exists", async () => {
      prisma.commissionSetting.findFirst.mockResolvedValue(null);
      prisma.order.findMany.mockResolvedValue([
        { totalAmount: new Prisma.Decimal('100.00') },
      ]);

      const { revenueSummary } = await service.getRevenueSummary(
        merchantUser,
        makeQuery(),
      );
      expect(revenueSummary.commissionRate).toBe('12.00');
      expect(revenueSummary.commission).toBe('12.00');
    });

    it('seeds a period-specific cache key with TTL', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-15T12:00:00.000Z'));

      await service.getRevenueSummary(
        merchantUser,
        makeQuery({ period: 'this_month' }),
      );

      expect(redis.set).toHaveBeenCalledWith(
        'cache:oi:merchant:merchant-1:summary:revenue:this_month:2026-03-01:2026-03-31',
        expect.any(String),
        ORDER_INSIGHTS_CONFIG.summaryCacheTtlSeconds,
      );
    });

    it('returns cached revenue without querying on HIT', async () => {
      const cached = {
        revenueSummary: {
          sales: '1.00',
          commission: '0.12',
          revenue: '0.88',
          aov: '0.88',
          orderCount: 1,
          commissionRate: '12.00',
          commissionRateSource: 'current_settings' as const,
          commissionRateLocked: false,
          period: {
            code: 'this_month' as const,
            from: '2026-03-01',
            to: '2026-03-31',
          },
        },
      };
      redis.get.mockResolvedValue(JSON.stringify(cached));

      await expect(
        service.getRevenueSummary(merchantUser, makeQuery()),
      ).resolves.toEqual(cached);
      expect(prisma.order.findMany).not.toHaveBeenCalled();
    });
  });

  describe('rate limiting', () => {
    it('throws 429 on the 31st call within the window', async () => {
      redis.checkRateLimit
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await service.getSalesSummary(merchantUser, {});
      await expect(service.getSalesSummary(merchantUser, {})).rejects.toEqual(
        new HttpException(
          'Too many requests. Please wait 60 seconds',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
      expect(redis.checkRateLimit).toHaveBeenCalledWith(
        `rate:order-insights:sales-summary:${merchantUser.id}`,
        30,
        60,
      );
    });
  });

  describe('invalidateMerchantSummaryCache', () => {
    it('scans and deletes keys matching the merchant summary pattern', async () => {
      const scan = jest
        .fn()
        .mockResolvedValueOnce([
          '12',
          ['cache:oi:merchant:merchant-1:summary:sales'],
        ])
        .mockResolvedValueOnce([
          '0',
          [
            'cache:oi:merchant:merchant-1:summary:revenue:today:2026-03-15:2026-03-15',
          ],
        ]);
      redis.getClient.mockReturnValue({ scan });

      await service.invalidateMerchantSummaryCache('merchant-1');

      expect(scan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        'cache:oi:merchant:merchant-1:summary:*',
        'COUNT',
        100,
      );
      expect(redis.del).toHaveBeenCalledWith(
        'cache:oi:merchant:merchant-1:summary:sales',
      );
      expect(redis.del).toHaveBeenCalledWith(
        'cache:oi:merchant:merchant-1:summary:revenue:today:2026-03-15:2026-03-15',
      );
    });

    it('is a no-op when the Redis client is null', async () => {
      redis.getClient.mockReturnValue(null);

      await service.invalidateMerchantSummaryCache('merchant-1');

      expect(redis.del).not.toHaveBeenCalled();
    });
  });
});
