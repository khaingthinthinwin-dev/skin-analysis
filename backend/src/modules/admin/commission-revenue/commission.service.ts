import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import { UpdateCommissionRateDto } from './dto/update-commission-rate.dto';
import { CommissionReportQueryDto } from './dto/commission-report-query.dto';
import { fmtDecimal, toNumber } from './commission-revenue.util';

@Injectable()
export class CommissionService {
  constructor(private readonly prisma: PrismaService) {}

  async getRate(): Promise<number> {
    const settings = await this.prisma.commissionSetting.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    return settings ? toNumber(settings.commissionRate) : 0;
  }

  /**
   * Returns the commission rate that was effective at the given point in time.
   * Looks up the most recent history entry whose effectiveFrom <= at.
   * Falls back to the singleton commission_settings row for orders placed
   * before any history entry exists.
   */
  async getEffectiveRate(at: Date): Promise<number> {
    const historyEntry = await this.prisma.commissionRateHistory.findFirst({
      where: { effectiveFrom: { lte: at } },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (historyEntry) return toNumber(historyEntry.commissionRate);

    // Fallback: use current singleton setting
    return this.getRate();
  }

  /**
   * Returns all commission rate history entries, newest first.
   */
  async getRateHistory() {
    const history = await this.prisma.commissionRateHistory.findMany({
      orderBy: { effectiveFrom: 'desc' },
      include: {
        createdByAdmin: { select: { id: true, name: true, email: true } },
      },
    });
    return history.map((h) => ({
      id: h.id,
      rate: fmtDecimal(h.commissionRate),
      effectiveFrom: h.effectiveFrom,
      createdAt: h.createdAt,
      updatedBy: h.createdByAdmin
        ? {
            id: h.createdByAdmin.id,
            name: h.createdByAdmin.name,
            email: h.createdByAdmin.email,
          }
        : null,
    }));
  }

  async getCommissionSettings() {
    const rate = await this.getRate();
    return { rate: fmtDecimal(rate) };
  }

  async updateCommissionRate(
    dto: UpdateCommissionRateDto,
    adminId: string,
    ip?: string,
  ) {
    const newRate = Number(dto.rate);
    if (newRate <= 0 || newRate > 100) {
      throw new BadRequestException(
        'Commission rate must be greater than 0 and at most 100',
      );
    }

    const oldRate = await this.getRate();
    const now = new Date();

    const settings = await this.prisma.commissionSetting.findFirst();

    const saved = settings
      ? await this.prisma.commissionSetting.update({
          where: { id: settings.id },
          data: {
            commissionRate: newRate,
            updatedBy: adminId,
            updatedAt: now,
          },
        })
      : await this.prisma.commissionSetting.create({
          data: {
            commissionRate: newRate,
            updatedBy: adminId,
          },
        });

    // Record the rate change in history
    await this.prisma.commissionRateHistory.create({
      data: {
        commissionRate: newRate,
        effectiveFrom: now,
        createdBy: adminId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'COMMISSION_RATE_UPDATED',
        entityType: 'CommissionSetting',
        entityId: saved.id,
        oldValue: { rate: fmtDecimal(oldRate) },
        newValue: { rate: fmtDecimal(newRate) },
        ipAddress: ip,
      },
    });

    return { rate: fmtDecimal(newRate) };
  }

  async getCommissionReports(query: CommissionReportQueryDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException(
        'From date must be earlier than or equal to To date',
      );
    }

    const where: Prisma.OrderWhereInput = {
      paymentStatus: 'completed',
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to
                ? { lte: new Date(`${query.to}T23:59:59.999Z`) }
                : {}),
            },
          }
        : {}),
    };

    const completedOrders = await this.prisma.order.findMany({
      where,
      select: {
        merchantId: true,
        totalAmount: true,
        createdAt: true,
        merchant: { select: { id: true, shopName: true } },
      },
    });

    // Group orders by merchant AND effective commission rate so that each
    // unique rate gets its own row in the report.
    const grouped = new Map<
      string,
      {
        merchantId: string;
        name: string;
        rate: number;
        orders: number;
        revenue: number;
        commission: number;
      }
    >();
    for (const order of completedOrders) {
      const effectiveRate = await this.getEffectiveRate(order.createdAt);
      const key = `${order.merchantId}_${effectiveRate}`;
      const entry = grouped.get(key) ?? {
        merchantId: order.merchantId,
        name: order.merchant?.shopName ?? 'Unknown',
        rate: effectiveRate,
        orders: 0,
        revenue: 0,
        commission: 0,
      };
      const orderAmount = toNumber(order.totalAmount);
      entry.orders += 1;
      entry.revenue += orderAmount;
      entry.commission += (orderAmount * effectiveRate) / 100;
      grouped.set(key, entry);
    }

    const allReports = Array.from(grouped.values()).map((g) => ({
      merchantId: g.merchantId,
      merchantName: g.name,
      commissionRate: fmtDecimal(g.rate),
      orders: g.orders,
      revenue: fmtDecimal(g.revenue),
      commission: fmtDecimal(g.commission),
    }));

    allReports.sort((a, b) => a.merchantName.localeCompare(b.merchantName));

    const total = allReports.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const reports = allReports.slice(start, start + limit);

    return {
      reports,
      pagination: { page, limit, total, totalPages },
    };
  }
}
