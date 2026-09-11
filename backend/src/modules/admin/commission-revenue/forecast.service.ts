import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TrendRange } from './dto/revenue-trend-query.dto';
import {
  fmtDecimal,
  toNumber,
  getRangeStart,
  getPeriodStart,
  buildBucketKeys,
  formatBucket,
} from './commission-revenue.util';

const MIN_POINTS = 7;

interface SeriesPoint {
  date: string;
  revenue: number;
  commission: number;
  adFee: number;
}

interface LineFit {
  slope: number;
  intercept: number;
}

function linearFit(points: { x: number; y: number }[]): LineFit {
  if (points.length === 0) return { slope: 0, intercept: 0 };
  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

@Injectable()
export class ForecastService {
  constructor(private readonly prisma: PrismaService) {}

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

  async generateForecast(range: TrendRange, now: Date = new Date()) {
    const groupBy: 'day' | 'month' =
      range === TrendRange.ONE_YEAR ? 'month' : 'day';
    const rangeStart = getRangeStart(range, now);

    const [completedOrders, completedAdPayments] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          paymentStatus: 'completed',
          createdAt: { gte: rangeStart },
        },
        select: { totalAmount: true, createdAt: true },
      }),
      this.prisma.adPayment.findMany({
        where: {
          paymentStatus: 'completed',
          createdAt: { gte: rangeStart },
        },
        select: { amount: true, createdAt: true },
      }),
    ]);

    // Get current rate for forecast projections
    const currentSetting = await this.prisma.commissionSetting.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    const currentRate = currentSetting
      ? toNumber(currentSetting.commissionRate)
      : 0;

    const keys = buildBucketKeys(rangeStart, now, groupBy);
    const bucket = new Map<
      string,
      { revenue: number; commission: number; adFee: number }
    >(keys.map((k) => [k, { revenue: 0, commission: 0, adFee: 0 }]));

    for (const o of completedOrders) {
      const k = formatBucket(o.createdAt, groupBy);
      const b = bucket.get(k);
      if (b) {
        const amount = toNumber(o.totalAmount);
        const rate = await this.getEffectiveRate(o.createdAt);
        b.revenue += amount;
        b.commission += (amount * rate) / 100;
      }
    }
    for (const a of completedAdPayments) {
      const k = formatBucket(a.createdAt, groupBy);
      const b = bucket.get(k);
      if (b) b.adFee += toNumber(a.amount);
    }

    // Keep only buckets that have at least one data point.
    const populated = keys
      .filter((k) => {
        const b = bucket.get(k);
        return b && (b.revenue > 0 || b.adFee > 0);
      })
      .map<SeriesPoint>((k, _idx) => {
        const b = bucket.get(k)!;
        return {
          date: k,
          revenue: b.revenue,
          commission: b.commission,
          adFee: b.adFee,
        };
      });

    if (populated.length < MIN_POINTS) {
      return {
        forecastPoints: [],
        note: 'Not enough historical data to generate a forecast',
      };
    }

    const revenueFit = linearFit(
      populated.map((p, i) => ({ x: i, y: p.revenue })),
    );
    const adFeeFit = linearFit(populated.map((p, i) => ({ x: i, y: p.adFee })));

    // Project forward until the end of the selected range (or current period end for 1y).
    const lastKey = populated[populated.length - 1].date;
    const lastDate = new Date(
      groupBy === 'month'
        ? `${lastKey}-01T00:00:00.000Z`
        : `${lastKey}T00:00:00.000Z`,
    );
    // Always extend the forecast at least one point past the last actual data point,
    // so the dotted AI-forecast line is visible even when the data already reaches today.

    const minHorizon = new Date(lastDate);
    if (groupBy === 'month') minHorizon.setMonth(minHorizon.getMonth() + 1);
    else minHorizon.setDate(minHorizon.getDate() + 1);
    const rangeEnd =
      range === TrendRange.ONE_YEAR ? getPeriodStart('quarterly', now) : now;

    const horizonEnd =
      rangeEnd.getTime() > minHorizon.getTime() ? rangeEnd : minHorizon;

    const forecastPoints: {
      date: string;
      forecastRevenue: string;
      forecastCommission: string;
      forecastAdFee: string;
    }[] = [];

    let startIndex = populated.length;
    let cursor = new Date(lastDate);
    let guard = 0;
    while (cursor <= horizonEnd && guard < 1000) {
      cursor = new Date(cursor);
      if (groupBy === 'month') cursor.setMonth(cursor.getMonth() + 1);
      else cursor.setDate(cursor.getDate() + 1);
      guard += 1;

      const revenue = Math.max(
        0,
        revenueFit.intercept + revenueFit.slope * startIndex,
      );
      const adFee = Math.max(
        0,
        adFeeFit.intercept + adFeeFit.slope * startIndex,
      );
      const dateKey = formatBucket(cursor, groupBy);
      if (dateKey <= lastKey) continue;

      forecastPoints.push({
        date: dateKey,
        forecastRevenue: fmtDecimal(revenue),
        forecastCommission: fmtDecimal((revenue * currentRate) / 100),
        forecastAdFee: fmtDecimal(adFee),
      });
      startIndex += 1;
    }

    return { forecastPoints };
  }
}
