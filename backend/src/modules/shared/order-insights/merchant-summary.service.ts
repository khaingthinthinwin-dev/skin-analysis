import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { ORDER_INSIGHTS_CONFIG } from './order-insights.config';
import { MerchantScopeQueryDto } from './dto/merchant-scope-query.dto';
import { RevenueSummaryEnvelopeDto } from './dto/revenue-summary-response.dto';
import { SalesSummaryEnvelopeDto } from './dto/sales-summary-response.dto';
import { SummaryQueryDto } from './dto/summary-query.dto';
import { SummaryPeriod } from './dto/order-insights.types';
import {
  resolvePeriodWindowUtc,
  utcStartOfDay,
  utcStartOfMonth,
} from './period-window';

const RATE_WINDOW_SECONDS = 60;
const ROUND_HALF_UP = Prisma.Decimal.ROUND_HALF_UP;

type MerchantScope = {
  merchantId: string | null;
  cacheScope: string;
};

@Injectable()
export class MerchantSummaryService {
  private readonly logger = new Logger(MerchantSummaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Returns today / this-month / completed order counts for the resolved merchant scope.
   */
  async getSalesSummary(
    user: AuthUser,
    query: MerchantScopeQueryDto = {},
  ): Promise<SalesSummaryEnvelopeDto> {
    await this.assertRateLimit('sales-summary', user.id);
    const scope = await this.resolveMerchantScope(user, query.merchantId);
    const cacheKey = `cache:oi:merchant:${scope.cacheScope}:summary:sales`;

    const cached = await this.readCache<SalesSummaryEnvelopeDto>(cacheKey);
    if (cached) {
      this.recordSummaryViewed(user.id, scope.merchantId, 'sales');
      return cached;
    }

    const now = new Date();
    const todayStart = utcStartOfDay(now);
    const tomorrowStart = new Date(
      Date.UTC(
        todayStart.getUTCFullYear(),
        todayStart.getUTCMonth(),
        todayStart.getUTCDate() + 1,
      ),
    );
    const monthStart = utcStartOfMonth(now);
    const nextMonthStart = new Date(
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1),
    );

    const scopeWhere = this.toScopeWhere(scope);
    const [todayCount, thisMonthCount, completedCount] = await Promise.all([
      this.prisma.order.count({
        where: {
          ...scopeWhere,
          createdAt: { gte: todayStart, lt: tomorrowStart },
        },
      }),
      this.prisma.order.count({
        where: {
          ...scopeWhere,
          createdAt: { gte: monthStart, lt: nextMonthStart },
        },
      }),
      this.prisma.order.count({
        where: { ...scopeWhere, statusCode: 'delivered' },
      }),
    ]);

    const result: SalesSummaryEnvelopeDto = {
      salesSummary: { todayCount, thisMonthCount, completedCount },
    };

    await this.redis.set(
      cacheKey,
      JSON.stringify(result),
      ORDER_INSIGHTS_CONFIG.summaryCacheTtlSeconds,
    );
    this.recordSummaryViewed(user.id, scope.merchantId, 'sales');
    return result;
  }

  /**
   * Returns sales, commission, net revenue, and AOV for one UTC period window.
   */
  async getRevenueSummary(
    user: AuthUser,
    query: SummaryQueryDto,
  ): Promise<RevenueSummaryEnvelopeDto> {
    await this.assertRateLimit('revenue-summary', user.id);
    const scope = await this.resolveMerchantScope(user, query.merchantId);
    const period: SummaryPeriod =
      query.period ?? ORDER_INSIGHTS_CONFIG.defaultSummaryPeriod;
    const window = resolvePeriodWindowUtc(period, query.from, query.to);
    const cacheKey = `cache:oi:merchant:${scope.cacheScope}:summary:revenue:${window.code}:${window.from}:${window.to}`;

    const cached = await this.readCache<RevenueSummaryEnvelopeDto>(cacheKey);
    if (cached) {
      this.recordSummaryViewed(
        user.id,
        scope.merchantId,
        'revenue',
        window.code,
      );
      return cached;
    }

    const [setting, rows] = await Promise.all([
      this.prisma.commissionSetting.findFirst({
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.order.findMany({
        where: {
          ...this.toScopeWhere(scope),
          createdAt: { gte: window.start, lt: window.endExclusive },
        },
        select: { totalAmount: true },
      }),
    ]);

    const commissionRate = setting
      ? new Prisma.Decimal(setting.commissionRate.toString()).toFixed(2)
      : ORDER_INSIGHTS_CONFIG.defaultCommissionRate;
    const rateFactor = new Prisma.Decimal(commissionRate).div(100);

    let sales = new Prisma.Decimal(0);
    let commission = new Prisma.Decimal(0);
    for (const row of rows) {
      const amount = new Prisma.Decimal(row.totalAmount.toString());
      sales = sales.plus(amount);
      commission = commission.plus(
        amount.mul(rateFactor).toDecimalPlaces(2, ROUND_HALF_UP),
      );
    }

    const orderCount = rows.length;
    const revenue = sales.minus(commission);
    const aov =
      orderCount > 0
        ? revenue.div(orderCount).toDecimalPlaces(2, ROUND_HALF_UP)
        : new Prisma.Decimal(0);

    const result: RevenueSummaryEnvelopeDto = {
      revenueSummary: {
        sales: sales.toFixed(2),
        commission: commission.toFixed(2),
        revenue: revenue.toFixed(2),
        aov: aov.toFixed(2),
        orderCount,
        commissionRate,
        commissionRateSource: 'current_settings',
        commissionRateLocked: false,
        period: {
          code: window.code,
          from: window.from,
          to: window.to,
        },
      },
    };

    await this.redis.set(
      cacheKey,
      JSON.stringify(result),
      ORDER_INSIGHTS_CONFIG.summaryCacheTtlSeconds,
    );
    this.recordSummaryViewed(user.id, scope.merchantId, 'revenue', window.code);
    return result;
  }

  /**
   * Deletes cached sales/revenue summaries for one merchant. No-op when Redis is unavailable.
   */
  async invalidateMerchantSummaryCache(merchantId: string): Promise<void> {
    const client = this.redis.getClient();
    if (!client) {
      return;
    }

    const pattern = `cache:oi:merchant:${merchantId}:summary:*`;
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to invalidate merchant summary cache: ${message}`,
      );
    }
  }

  private async assertRateLimit(
    endpoint: string,
    userId: string,
  ): Promise<void> {
    const allowed = await this.redis.checkRateLimit(
      `rate:order-insights:${endpoint}:${userId}`,
      ORDER_INSIGHTS_CONFIG.rateLimitSummaryPerMinute,
      RATE_WINDOW_SECONDS,
    );
    if (!allowed) {
      throw new HttpException(
        'Too many requests. Please wait 60 seconds',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async resolveMerchantScope(
    user: AuthUser,
    requestedMerchantId?: string,
  ): Promise<MerchantScope> {
    if (user.roleCode === 'merchant') {
      const merchant = await this.prisma.merchant.findUnique({
        where: { userId: user.id },
      });
      if (!merchant || merchant.licenseStatus !== 'approved') {
        throw new ForbiddenException('Your merchant account is not approved');
      }
      return { merchantId: merchant.id, cacheScope: merchant.id };
    }

    if (user.roleCode === 'admin' || user.roleCode === 'super_admin') {
      if (requestedMerchantId) {
        return {
          merchantId: requestedMerchantId,
          cacheScope: requestedMerchantId,
        };
      }
      return { merchantId: null, cacheScope: 'all' };
    }

    throw new ForbiddenException('Insufficient permissions');
  }

  private toScopeWhere(scope: MerchantScope): { merchantId?: string } {
    return scope.merchantId ? { merchantId: scope.merchantId } : {};
  }

  private async readCache<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  }

  private recordSummaryViewed(
    userId: string,
    merchantId: string | null,
    summaryType: 'sales' | 'revenue',
    period?: SummaryPeriod,
  ): void {
    const data: {
      userId: string;
      action: string;
      entityType: string;
      entityId?: string;
      newValue: { summaryType: 'sales' | 'revenue'; period?: SummaryPeriod };
    } = {
      userId,
      action: 'MERCHANT_SUMMARY_VIEWED',
      entityType: 'order_insights',
      newValue: period ? { summaryType, period } : { summaryType },
    };
    if (merchantId) {
      data.entityId = merchantId;
    }

    void this.prisma.auditLog.create({ data }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to write MERCHANT_SUMMARY_VIEWED audit: ${message}`,
      );
    });
  }
}
