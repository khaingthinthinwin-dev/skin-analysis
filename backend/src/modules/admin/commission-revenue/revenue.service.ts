import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import { TargetPeriod } from './dto/save-revenue-target.dto';
import { SaveRevenueTargetDto } from './dto/save-revenue-target.dto';
import { PayoutQueryDto } from './dto/payout-query.dto';
import { ForecastService } from './forecast.service';
import {
  fmtDecimal,
  toNumber,
  getRangeStart,
  getPeriodStart,
  buildBucketKeys,
  formatBucket,
} from './commission-revenue.util';

type RevenuePayoutRow = {
  id: string;
  payoutId: string;
  merchantId: string;
  merchantName: string;
  orderId: string | null;
  commissionRate: string;
  totalAmount: string;
  commissionAmount: string;
  adFeeAmount: string;
  netAmount: string;
  status: string;
  failureReason: string | null;
  createdAt: Date;
  processedAt: Date | null;
  canDelete: boolean;
};

type RevenuePayout = Prisma.PayoutGetPayload<{
  include: {
    merchant: {
      select: {
        id: true;
        shopName: true;
        user: { select: { id: true; name: true; email: true } };
      };
    };
    order: {
      select: {
        id: true;
        orderNumber: true;
        createdAt: true;
        totalAmount: true;
      };
    };
  };
}>;

@Injectable()
export class RevenueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly forecastService: ForecastService,
  ) {}

  private async getEffectiveRate(at: Date): Promise<number> {
    const historyEntry = await this.prisma.commissionRateHistory.findFirst({
      where: { effectiveFrom: { lte: at } },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (historyEntry) return toNumber(historyEntry.commissionRate);

    const settings = await this.prisma.commissionSetting.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    return settings ? toNumber(settings.commissionRate) : 0;
  }

  async getRevenueKPIs(range: string) {
    const now = new Date();
    const rangeStart = getRangeStart(range, now);

    const [completedOrders, adFeeAgg] = await Promise.all([
      this.prisma.order.findMany({
        where: { paymentStatus: 'completed', createdAt: { gte: rangeStart } },
        select: { totalAmount: true, createdAt: true },
      }),
      this.prisma.adPayment.aggregate({
        where: { paymentStatus: 'completed', createdAt: { gte: rangeStart } },
        _sum: { amount: true },
      }),
    ]);

    let totalRevenue = 0;
    let totalCommission = 0;
    for (const order of completedOrders) {
      const amount = toNumber(order.totalAmount);
      const rate = await this.getEffectiveRate(order.createdAt);
      totalRevenue += amount;
      totalCommission += (amount * rate) / 100;
    }

    const orderCount = completedOrders.length;
    const adFeeRevenue = toNumber(adFeeAgg._sum.amount);
    const totalIncome = totalCommission + adFeeRevenue;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
    const netRevenue = totalRevenue - totalCommission; // Platform net = order revenue after commission

    return {
      kpis: {
        totalRevenue: fmtDecimal(totalRevenue),
        totalCommission: fmtDecimal(totalCommission),
        adFeeRevenue: fmtDecimal(adFeeRevenue),
        totalIncome: fmtDecimal(totalIncome),
        avgOrderValue: fmtDecimal(avgOrderValue),
        netRevenue: fmtDecimal(netRevenue),
      },
    };
  }

  async getRevenueTrends(range: string) {
    const now = new Date();
    const rangeStart = getRangeStart(range, now);
    const groupBy: 'day' | 'month' = range === '1y' ? 'month' : 'day';

    const keys = buildBucketKeys(rangeStart, now, groupBy);
    const buckets = new Map<
      string,
      { revenue: number; commission: number; adFee: number }
    >(keys.map((k) => [k, { revenue: 0, commission: 0, adFee: 0 }]));

    const [orders, adPayments] = await Promise.all([
      this.prisma.order.findMany({
        where: { paymentStatus: 'completed', createdAt: { gte: rangeStart } },
        select: { totalAmount: true, createdAt: true },
      }),
      this.prisma.adPayment.findMany({
        where: { paymentStatus: 'completed', createdAt: { gte: rangeStart } },
        select: { amount: true, createdAt: true },
      }),
    ]);

    for (const o of orders) {
      const b = buckets.get(formatBucket(o.createdAt, groupBy));
      if (b) {
        const amount = toNumber(o.totalAmount);
        const rate = await this.getEffectiveRate(o.createdAt);
        b.revenue += amount;
        b.commission += (amount * rate) / 100;
      }
    }
    for (const a of adPayments) {
      const b = buckets.get(formatBucket(a.createdAt, groupBy));
      if (b) b.adFee += toNumber(a.amount);
    }

    const trendPoints = keys.map((k) => {
      const b = buckets.get(k)!;
      return {
        date: k,
        revenue: fmtDecimal(b.revenue),
        commission: fmtDecimal(b.commission),
        adFee: fmtDecimal(b.adFee),
        totalIncome: fmtDecimal(b.commission + b.adFee),
      };
    });

    return { trendPoints };
  }

  async getTargetProgress(period: TargetPeriod) {
    const now = new Date();
    const target = await this.prisma.revenueTarget.findFirst({
      where: { period, isActive: true },
    });

    if (!target) {
      return { target: null };
    }

    const periodStart = getPeriodStart(period, now);
    const orderAgg = await this.prisma.order.aggregate({
      where: { paymentStatus: 'completed', createdAt: { gte: periodStart } },
      _sum: { totalAmount: true },
    });

    const actualRevenue = toNumber(orderAgg._sum.totalAmount);
    const targetAmount = toNumber(target.targetAmount);
    const progressPercent =
      targetAmount > 0 ? (actualRevenue / targetAmount) * 100 : 0;

    return {
      target: {
        targetAmount: fmtDecimal(targetAmount),
        period: target.period,
        actualRevenue: fmtDecimal(actualRevenue),
        progressPercent: fmtDecimal(progressPercent),
      },
    };
  }

  async saveTarget(dto: SaveRevenueTargetDto, adminId: string, ip?: string) {
    const now = new Date();
    const newAmount = Number(dto.targetAmount);

    const existing = await this.prisma.revenueTarget.findFirst({
      where: { period: dto.targetPeriod, isActive: true },
    });

    const saved = existing
      ? await this.prisma.revenueTarget.update({
          where: { id: existing.id },
          data: {
            targetAmount: newAmount,
            createdBy: adminId,
            updatedAt: now,
          },
        })
      : await this.prisma.revenueTarget.create({
          data: {
            targetAmount: newAmount,
            period: dto.targetPeriod,
            isActive: true,
            createdBy: adminId,
          },
        });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'TARGET_UPDATED',
        entityType: 'RevenueTarget',
        entityId: saved.id,
        oldValue: {
          targetAmount: existing ? fmtDecimal(existing.targetAmount) : null,
        },
        newValue: {
          targetAmount: fmtDecimal(newAmount),
          period: dto.targetPeriod,
        },
        ipAddress: ip,
      },
    });

    const progress = await this.getTargetProgress(dto.targetPeriod);
    const target = progress.target;
    return {
      targetAmount: fmtDecimal(newAmount),
      targetPeriod: dto.targetPeriod,
      actualRevenue: target?.actualRevenue ?? '0.00',
      progressPercent: target?.progressPercent ?? '0.00',
    };
  }

  async getPaymentStatus(range: string) {
    const rangeStart = getRangeStart(range, new Date());
    const [completed, pending] = await Promise.all([
      this.prisma.order.count({
        where: { paymentStatus: 'completed', createdAt: { gte: rangeStart } },
      }),
      this.prisma.order.count({
        where: { paymentStatus: 'pending', createdAt: { gte: rangeStart } },
      }),
    ]);
    return { completed, pending };
  }

  async getAdFeeRevenue(range: string) {
    const now = new Date();
    const rangeStart = getRangeStart(range, now);
    const groupBy: 'day' | 'month' = range === '1y' ? 'month' : 'day';

    const keys = buildBucketKeys(rangeStart, now, groupBy);
    const buckets = new Map<string, number>(keys.map((k) => [k, 0]));

    const adPayments = await this.prisma.adPayment.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: { amount: true, paymentStatus: true, createdAt: true },
    });

    for (const p of adPayments) {
      if (p.paymentStatus !== 'completed') continue;
      const k = formatBucket(p.createdAt, groupBy);
      const v = buckets.get(k);
      if (v !== undefined) buckets.set(k, v + toNumber(p.amount));
    }

    const [
      completedAgg,
      activeAds,
      pendingCount,
      completedCount,
      refundedCount,
    ] = await Promise.all([
      this.prisma.adPayment.aggregate({
        where: { paymentStatus: 'completed', createdAt: { gte: rangeStart } },
        _sum: { amount: true },
      }),
      this.prisma.advertisement.count({
        where: {
          isActive: true,
          approvalStatus: 'approved',
          expiresAt: { gte: now },
        },
      }),
      this.prisma.adPayment.count({ where: { paymentStatus: 'pending' } }),
      this.prisma.adPayment.count({ where: { paymentStatus: 'completed' } }),
      this.prisma.adPayment.count({ where: { paymentStatus: 'refunded' } }),
    ]);

    return {
      adFeeKpis: {
        totalAdFees: fmtDecimal(completedAgg._sum.amount),
        activeAds,
        pendingPayments: pendingCount,
        completedPayments: completedCount,
      },
      adFeeTrendPoints: keys.map((k) => ({
        date: k,
        adFee: fmtDecimal(buckets.get(k) ?? 0),
      })),
      adFeePaymentStatus: {
        completed: completedCount,
        pending: pendingCount,
        refunded: refundedCount,
      },
    };
  }

  async getPayoutMerchants() {
    const merchants = await this.prisma.payout.findMany({
      select: {
        merchantId: true,
        merchant: {
          select: { shopName: true },
        },
      },
      distinct: ['merchantId'],
      orderBy: { createdAt: 'desc' },
    });

    return merchants.map((m) => ({
      id: m.merchantId,
      name: m.merchant?.shopName ?? 'Unknown',
    }));
  }

  async getPayouts(query: PayoutQueryDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.PayoutWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.merchantId) where.merchantId = query.merchantId;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
      };
    }

    // Each payout is now linked to a single order via orderId. Fetch all
    // matching payouts (no skip/take) so we can build per-order rows, sort by
    // order number descending, then paginate.
    const allPayouts: RevenuePayout[] = await this.prisma.payout.findMany({
      where,
      include: {
        merchant: {
          select: {
            id: true,
            shopName: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            totalAmount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows: RevenuePayoutRow[] = [];
    for (const p of allPayouts) {
      const rate = await this.getEffectiveRate(p.createdAt);
      const orderAmount = toNumber(p.order?.totalAmount ?? p.totalAmount);
      const commission = (orderAmount * rate) / 100;
      rows.push({
        id: p.order?.id ?? p.id,
        payoutId: p.id,
        merchantId: p.merchantId,
        merchantName: p.merchant?.shopName ?? 'Unknown',
        orderId: p.order?.orderNumber ?? null,
        commissionRate: fmtDecimal(rate),
        totalAmount: fmtDecimal(orderAmount),
        commissionAmount: fmtDecimal(commission),
        adFeeAmount: '0.00',
        netAmount: fmtDecimal(orderAmount - commission),
        status: p.status,
        failureReason: p.failureReason,
        createdAt: p.createdAt,
        processedAt: p.processedAt,
        canDelete: this.isPayoutDeletable(p.status, p.createdAt),
      });
    }

    // Sort by order number descending, then by order time descending
    rows.sort((a, b) => {
      if (a.orderId && b.orderId) {
        const cmp = b.orderId.localeCompare(a.orderId);
        if (cmp !== 0) return cmp;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = rows.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const items = rows.slice(start, start + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async processPayout(payoutId: string, adminId: string, ip?: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== 'pending') {
      throw new ConflictException('Payout has already been processed');
    }

    const now = new Date();
    const idempotencyKey = `payout-${now.toISOString().slice(0, 10)}-${payout.merchantId}`;

    const updated = await this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'completed',
        processedBy: adminId,
        processedAt: now,
        idempotencyKey,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'PAYOUT_PROCESSED',
        entityType: 'Payout',
        entityId: payoutId,
        oldValue: { status: 'pending' },
        newValue: {
          status: 'completed',
          amount: fmtDecimal(payout.totalAmount),
        },
        ipAddress: ip,
      },
    });

    return {
      payoutId: updated.id,
      merchantId: updated.merchantId,
      totalAmount: fmtDecimal(updated.totalAmount),
      commissionAmount: fmtDecimal(updated.commissionAmount),
      adFeeAmount: '0.00',
      netAmount: fmtDecimal(
        toNumber(updated.totalAmount) - toNumber(updated.commissionAmount),
      ),
      status: updated.status,
      processedAt: updated.processedAt,
      idempotencyKey: updated.idempotencyKey,
    };
  }

  private isPayoutDeletable(status: string, createdAt: Date, now = new Date()) {
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - 3);
    return status === 'completed' && createdAt <= cutoff;
  }

  async deletePayouts(payoutIds: string[], adminId: string, ip?: string) {
    const payouts = await this.prisma.payout.findMany({
      where: { id: { in: payoutIds } },
      include: { order: { select: { orderNumber: true } } },
    });
    const foundIds = new Set(payouts.map((payout) => payout.id));
    const missingIds = payoutIds.filter((payoutId) => !foundIds.has(payoutId));
    if (missingIds.length > 0) {
      throw new NotFoundException(`Payout not found: ${missingIds.join(', ')}`);
    }

    const ineligible = payouts.filter(
      (payout) => !this.isPayoutDeletable(payout.status, payout.createdAt),
    );
    if (ineligible.length > 0) {
      const orderNumbers = ineligible.map(
        (payout) => payout.order?.orderNumber ?? payout.id,
      );
      throw new ConflictException(
        `These orders cannot be deleted: ${orderNumbers.join(', ')}. ` +
          'Each payout must be completed and at least three months old.',
      );
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.payout.deleteMany({ where: { id: { in: payoutIds } } });
      await transaction.auditLog.createMany({
        data: payouts.map((payout) => ({
          userId: adminId,
          action: 'PAYOUT_DELETED',
          entityType: 'Payout',
          entityId: payout.id,
          oldValue: {
            status: payout.status,
            merchantId: payout.merchantId,
            orderId: payout.orderId,
            totalAmount: fmtDecimal(payout.totalAmount),
          },
          ipAddress: ip,
        })),
      });
    });

    return { payoutIds, deleted: true };
  }
}
