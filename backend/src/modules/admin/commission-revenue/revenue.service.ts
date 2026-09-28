import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
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
  payoutIds: string[];
  merchantId: string;
  merchantName: string;
  period: string;
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
  completedCount: number;
  completedTotal: string;
  completedCommission: string;
  pendingCount: number;
  pendingTotal: string;
  pendingCommission: string;
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
    items: {
      select: {
        orderAmount: true;
        commissionAmount: true;
        order: { select: { orderNumber: true; createdAt: true } };
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

  /**
   * Batch-load commission rate history and return a lookup function.
   * Avoids N+1 queries when computing rates for many orders.
   */
  private async buildRateLookup(): Promise<(at: Date) => number> {
    const [history, settings] = await Promise.all([
      this.prisma.commissionRateHistory.findMany({
        orderBy: { effectiveFrom: 'asc' },
      }),
      this.prisma.commissionSetting.findFirst({
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    const fallbackRate = settings ? toNumber(settings.commissionRate) : 0;
    return (at: Date): number => {
      let rate = fallbackRate;
      for (const entry of history) {
        if (entry.effectiveFrom <= at) {
          rate = toNumber(entry.commissionRate);
        } else {
          break;
        }
      }
      return rate;
    };
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
    const getRate = await this.buildRateLookup();
    for (const order of completedOrders) {
      const amount = toNumber(order.totalAmount);
      const rate = getRate(order.createdAt);
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

    const getRate = await this.buildRateLookup();
    for (const o of orders) {
      const b = buckets.get(formatBucket(o.createdAt, groupBy));
      if (b) {
        const amount = toNumber(o.totalAmount);
        const rate = getRate(o.createdAt);
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

    // Use transaction to prevent race condition (two concurrent creates)
    const saved = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.revenueTarget.findFirst({
        where: { period: dto.targetPeriod, isActive: true },
      });

      if (existing) {
        return tx.revenueTarget.update({
          where: { id: existing.id },
          data: {
            targetAmount: newAmount,
            createdBy: adminId,
            updatedAt: now,
          },
        });
      }

      return tx.revenueTarget.create({
        data: {
          targetAmount: newAmount,
          period: dto.targetPeriod,
          isActive: true,
          createdBy: adminId,
        },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'TARGET_UPDATED',
        entityType: 'RevenueTarget',
        entityId: saved.id,
        oldValue: {
          targetAmount: saved.id ? fmtDecimal(saved.targetAmount) : null,
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
    const [completed, processing, pending] = await Promise.all([
      this.prisma.payout.count({
        where: { status: 'completed', createdAt: { gte: rangeStart } },
      }),
      this.prisma.payout.count({
        where: { status: 'processing', createdAt: { gte: rangeStart } },
      }),
      this.prisma.payout.count({
        where: { status: 'pending', createdAt: { gte: rangeStart } },
      }),
    ]);
    return { completed, processing, pending };
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
      this.prisma.adPayment.count({
        where: { paymentStatus: 'pending', createdAt: { gte: rangeStart } },
      }),
      this.prisma.adPayment.count({
        where: { paymentStatus: 'completed', createdAt: { gte: rangeStart } },
      }),
      this.prisma.adPayment.count({
        where: { paymentStatus: 'refunded', createdAt: { gte: rangeStart } },
      }),
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

    if (query.period) {
      const periodStart = new Date(`${query.period}-01T00:00:00.000Z`);
      const periodEnd = new Date(
        Date.UTC(
          periodStart.getUTCFullYear(),
          periodStart.getUTCMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ),
      );
      where.periodStart = { gte: periodStart };
      where.periodEnd = { lte: periodEnd };
    } else if (query.from || query.to) {
      const from = query.from ? new Date(query.from) : undefined;
      const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined;
      const and: Prisma.PayoutWhereInput[] = [];
      if (from) and.push({ periodEnd: { gte: from } });
      if (to) and.push({ periodStart: { lte: to } });
      if (and.length > 0) where.AND = and;
    }

    const search = query.search?.trim();
    if (search) {
      const or: Prisma.PayoutWhereInput[] = [
        {
          merchant: {
            shopName: { contains: search, mode: 'insensitive' },
          },
        },
        {
          merchant: {
            user: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];

      const yearOnly = search.match(/^(\d{4})$/);
      const yearMonth = search.match(/^(\d{4})-(\d{1,2})$/);
      const monthNames = [
        'january',
        'february',
        'march',
        'april',
        'may',
        'june',
        'july',
        'august',
        'september',
        'october',
        'november',
        'december',
      ];
      const monthIndex = (name: string) => {
        const n = name.toLowerCase();
        const full = monthNames.findIndex(
          (m) => m.startsWith(n) && n.length >= 3,
        );
        return full;
      };
      const monthYear = search.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
      const yearMonthName = search.match(/^(\d{4})\s+([A-Za-z]{3,9})$/);
      const monthOnly = search.match(/^([A-Za-z]{3,9})$/);

      if (yearOnly) {
        const year = Number(yearOnly[1]);
        or.push({
          periodStart: {
            gte: new Date(Date.UTC(year, 0, 1)),
            lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
          },
        });
      } else if (yearMonth) {
        const year = Number(yearMonth[1]);
        const month = Number(yearMonth[2]);
        or.push({
          periodStart: {
            gte: new Date(Date.UTC(year, month - 1, 1)),
            lte: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
          },
        });
      } else if (monthYear || yearMonthName) {
        const monthStr = monthYear ? monthYear[1] : yearMonthName![2];
        const yearStr = monthYear ? monthYear[2] : yearMonthName![1];
        const m = monthIndex(monthStr);
        const year = Number(yearStr);
        if (m >= 0) {
          or.push({
            periodStart: {
              gte: new Date(Date.UTC(year, m, 1)),
              lte: new Date(Date.UTC(year, m + 1, 0, 23, 59, 59, 999)),
            },
          });
        }
      } else if (monthOnly) {
        const m = monthIndex(monthOnly[1]);
        if (m >= 0) {
          // Prisma has no EXTRACT(month); OR year windows so "Apr"/"Dec" match any year.
          for (let y = 2020; y <= 2035; y += 1) {
            or.push({
              periodStart: {
                gte: new Date(Date.UTC(y, m, 1)),
                lte: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)),
              },
            });
          }
        }
      }

      where.OR = or;
    }

    // Distinct period list ignores all filters so the dropdown always shows every payout period.
    const [total, statusGroup, allPayouts, periodRows] = (await Promise.all([
      this.prisma.payout.count({ where }),
      this.prisma.payout.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.payout.findMany({
        where,
        include: {
          merchant: {
            select: {
              id: true,
              shopName: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
          items: {
            select: {
              orderAmount: true,
              commissionAmount: true,
              order: { select: { orderNumber: true, createdAt: true } },
            },
          },
        },
        orderBy: [{ periodStart: 'desc' }, { merchant: { shopName: 'asc' } }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payout.findMany({
        select: { periodStart: true },
        distinct: ['periodStart'],
        orderBy: { periodStart: 'desc' },
      }),
    ])) as [
      number,
      Array<{ status: string; _count: { _all: number } }>,
      RevenuePayout[],
      Array<{ periodStart: Date }>,
    ];

    const statusCounts = { completed: 0, processing: 0, pending: 0 };
    for (const g of statusGroup) {
      if (g.status === 'completed') statusCounts.completed = g._count._all;
      else if (g.status === 'processing')
        statusCounts.processing = g._count._all;
      else if (g.status === 'pending') statusCounts.pending = g._count._all;
    }

    const getRate = await this.buildRateLookup();
    const items: RevenuePayoutRow[] = allPayouts.map((p) => {
      const period = p.periodStart.toISOString().slice(0, 7);
      const totalAmount = toNumber(p.totalAmount);
      const commissionAmount = toNumber(p.commissionAmount);
      const netAmount = totalAmount - commissionAmount;
      const rate =
        totalAmount > 0
          ? (commissionAmount / totalAmount) * 100
          : getRate(p.createdAt);
      const isCompleted = p.status === 'completed';
      const orderCount = p.orderCount || p.items.length;

      return {
        id: p.id,
        payoutId: p.id,
        payoutIds: [p.id],
        merchantId: p.merchantId,
        merchantName: p.merchant?.shopName ?? 'Unknown',
        period,
        orderId: null,
        commissionRate: fmtDecimal(rate),
        totalAmount: fmtDecimal(totalAmount),
        commissionAmount: fmtDecimal(commissionAmount),
        adFeeAmount: '0.00',
        netAmount: fmtDecimal(netAmount),
        status: p.status,
        failureReason: null,
        createdAt: p.createdAt,
        processedAt: p.processedAt,
        canDelete: this.isPayoutDeletable(p.status, p.createdAt),
        completedCount: isCompleted ? orderCount : 0,
        completedTotal: isCompleted ? fmtDecimal(totalAmount) : '0.00',
        completedCommission: isCompleted
          ? fmtDecimal(commissionAmount)
          : '0.00',
        pendingCount: isCompleted ? 0 : orderCount,
        pendingTotal: isCompleted ? '0.00' : fmtDecimal(totalAmount),
        pendingCommission: isCompleted ? '0.00' : fmtDecimal(commissionAmount),
      };
    });

    const totalPages = Math.ceil(total / limit);
    const periods = periodRows.map((r) =>
      r.periodStart.toISOString().slice(0, 7),
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      statusCounts,
      periods,
    };
  }

  async reviewPayout(payoutId: string, adminId: string, ip?: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== 'pending') {
      return {
        payoutId: payout.id,
        status: payout.status,
      };
    }

    // Conditional update prevents race condition: only one request succeeds
    const updated = await this.prisma.payout.update({
      where: { id: payoutId, status: 'pending' },
      data: {
        status: 'processing',
        processedBy: adminId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'PAYOUT_REVIEWED',
        entityType: 'Payout',
        entityId: payoutId,
        oldValue: { status: payout.status },
        newValue: { status: 'processing' },
        ipAddress: ip,
      },
    });

    return {
      payoutId: updated.id,
      status: updated.status,
    };
  }

  async processPayout(payoutId: string, adminId: string, ip?: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status === 'completed') {
      throw new ConflictException('Payout has already been processed');
    }
    if (payout.status === 'failed') {
      throw new BadRequestException(
        `Payout cannot be completed from 'failed' status`,
      );
    }

    const now = new Date();
    const idempotencyKey = `payout-${payout.id}`;

    // Conditional update prevents race condition: only one request succeeds
    // (accepts pending or processing → completed; Process is only enabled for pending)
    const updated = await this.prisma.payout.update({
      where: { id: payoutId, status: { in: ['pending', 'processing'] } },
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
        oldValue: { status: payout.status },
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
      include: {
        merchant: { select: { shopName: true } },
        items: { select: { orderId: true } },
      },
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
      const merchantPeriods = ineligible.map((payout) => {
        const merchantName = payout.merchant?.shopName ?? 'Unknown';
        const period = payout.periodStart.toISOString().slice(0, 7);
        return `${merchantName} (${period})`;
      });
      const uniqueMerchantPeriods = [...new Set(merchantPeriods)];
      throw new ConflictException(
        `These payouts cannot be deleted: ${uniqueMerchantPeriods.join(', ')}. ` +
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
            periodStart: payout.periodStart.toISOString(),
            orderIds: payout.items.map((item) => item.orderId),
            totalAmount: fmtDecimal(payout.totalAmount),
          },
          ipAddress: ip,
        })),
      });
    });

    return { payoutIds, deleted: true };
  }
}
