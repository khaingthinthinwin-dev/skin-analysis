import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  ExportRequestDto,
  ExportFormat,
  GroupByType,
} from './dto/export-request.dto';
import {
  fmtDecimal,
  fmtExportCurrency,
  toNumber,
} from './commission-revenue.util';
import { buildCsv, buildXlsx } from './file-builder';
import type { Response } from 'express';

const MAX_EXPORT_DAYS = 365;
const MAX_EXPORT_ROWS = 10000;

interface ExportFile {
  filename: string;
  mimeType: string;
  content: string; // base64
}

interface PayoutExportItem {
  commissionAmount: unknown;
  order: { totalAmount: unknown; orderNumber: string };
  payout: {
    periodStart: Date;
    status: string;
    processedAt: Date | null;
    merchant?: { shopName?: string | null } | null;
  };
}

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  private validateRange(dto: ExportRequestDto): void {
    const from = new Date(dto.dateFrom);
    const to = new Date(dto.dateTo);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Start date and end date are required');
    }
    if (to < from) {
      throw new BadRequestException('End date must be after start date');
    }
    const days =
      Math.floor(to.getTime() / 86400000) -
      Math.floor(from.getTime() / 86400000) +
      1;
    if (days > MAX_EXPORT_DAYS) {
      throw new BadRequestException('Date range cannot exceed 365 days');
    }
    if (![ExportFormat.CSV, ExportFormat.XLSX].includes(dto.format)) {
      throw new BadRequestException('Invalid export format. Use CSV or Excel.');
    }
  }

  private async audit(
    adminId: string,
    reportType: string,
    dto: ExportRequestDto,
    rowCount: number,
    ip?: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'EXPORT_GENERATED',
        entityType: 'Export',
        newValue: {
          reportType,
          format: dto.format,
          dateFrom: dto.dateFrom,
          dateTo: dto.dateTo,
          rowCount,
        },
        ipAddress: ip,
      },
    });
  }

  private getDateString(date: string | Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private payload(
    dateFrom: string,
    dateTo: string,
    format: ExportFormat,
    rowCount: number,
    buffer: Buffer,
    reportLabel: string,
  ): ExportFile {
    const dateRange = `${this.getDateString(dateFrom)}-${this.getDateString(dateTo)}`;
    const generationDate = this.getDateString(new Date());
    const filename = `${reportLabel} report ${dateRange}(${generationDate})(${format === ExportFormat.XLSX ? 'xlsx' : 'csv'})`;
    return {
      filename,
      mimeType:
        format === ExportFormat.XLSX
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv',
      content: buffer.toString('base64'),
    };
  }

  private encode(
    header: string[],
    rows: (string | number)[][],
    format: ExportFormat,
  ): Buffer {
    return format === ExportFormat.XLSX
      ? buildXlsx(header, rows)
      : buildCsv(header, rows);
  }

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

  async generateCommissionReport(
    dto: ExportRequestDto,
    adminId: string,
    ip?: string,
  ): Promise<ExportFile> {
    this.validateRange(dto);
    const groupBy: GroupByType = dto.groupBy ?? 'merchant';

    const orders = await this.prisma.order.findMany({
      where: {
        paymentStatus: 'completed',
        createdAt: {
          gte: new Date(dto.dateFrom),
          lte: new Date(`${dto.dateTo}T23:59:59.999Z`),
        },
      },
      select: {
        id: true,
        orderNumber: true,
        merchantId: true,
        totalAmount: true,
        createdAt: true,
        merchant: { select: { shopName: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: MAX_EXPORT_ROWS,
    });

    const truncated = orders.length >= MAX_EXPORT_ROWS;
    const getRate = await this.buildRateLookup();

    let header: string[];
    let rows: (string | number)[][];

    if (groupBy === 'order') {
      header = [
        'Order Number',
        'Date',
        'Merchant',
        'Commission Rate',
        'Revenue',
        'Commission',
      ];
      rows = [];
      for (const o of orders) {
        const rate = getRate(o.createdAt);
        const amount = toNumber(o.totalAmount);
        const commission = (amount * rate) / 100;
        const dateStr = o.createdAt
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19);
        rows.push([
          o.orderNumber,
          dateStr,
          o.merchant?.shopName ?? 'Unknown',
          `${fmtDecimal(rate)}%`,
          fmtExportCurrency(amount),
          fmtExportCurrency(commission),
        ]);
      }
    } else if (groupBy === 'day') {
      header = [
        'Date',
        'Merchant',
        'Commission Rate',
        'Orders',
        'Revenue',
        'Commission',
      ];
      const grouped = new Map<
        string,
        {
          date: string;
          name: string;
          rate: number;
          orders: number;
          revenue: number;
          commission: number;
        }
      >();
      for (const o of orders) {
        const rate = getRate(o.createdAt);
        const dateStr = o.createdAt.toISOString().split('T')[0];
        const key = `${dateStr}_${o.merchantId}_${rate}`;
        const g = grouped.get(key) ?? {
          date: dateStr,
          name: o.merchant?.shopName ?? 'Unknown',
          rate,
          orders: 0,
          revenue: 0,
          commission: 0,
        };
        const amount = toNumber(o.totalAmount);
        g.orders += 1;
        g.revenue += amount;
        g.commission += (amount * rate) / 100;
        grouped.set(key, g);
      }
      rows = Array.from(grouped.values())
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) || a.name.localeCompare(b.name),
        )
        .map((g) => [
          g.date,
          g.name,
          `${fmtDecimal(g.rate)}%`,
          g.orders,
          fmtExportCurrency(g.revenue),
          fmtExportCurrency(g.commission),
        ]);
    } else {
      // By Merchant (default)
      header = [
        'Merchant',
        'Commission Rate',
        'Orders',
        'Revenue',
        'Commission',
      ];
      const grouped = new Map<
        string,
        {
          name: string;
          rate: number;
          orders: number;
          revenue: number;
          commission: number;
        }
      >();
      for (const o of orders) {
        const rate = getRate(o.createdAt);
        const key = `${o.merchantId}_${rate}`;
        const g = grouped.get(key) ?? {
          name: o.merchant?.shopName ?? 'Unknown',
          rate,
          orders: 0,
          revenue: 0,
          commission: 0,
        };
        const amount = toNumber(o.totalAmount);
        g.orders += 1;
        g.revenue += amount;
        g.commission += (amount * rate) / 100;
        grouped.set(key, g);
      }
      rows = Array.from(grouped.values()).map((g) => [
        g.name,
        `${fmtDecimal(g.rate)}%`,
        g.orders,
        fmtExportCurrency(g.revenue),
        fmtExportCurrency(g.commission),
      ]);
    }

    if (truncated) {
      rows.push([
        `Warning: Results truncated at ${MAX_EXPORT_ROWS.toLocaleString()} rows. Narrow your date range or filter by merchant.`,
        '',
      ]);
    }

    const buffer = this.encode(header, rows, dto.format);
    await this.audit(adminId, 'commission', dto, rows.length, ip);

    return this.payload(
      dto.dateFrom,
      dto.dateTo,
      dto.format,
      rows.length,
      buffer,
      `commission report(${dto.groupBy === 'day' ? 'by date' : dto.groupBy === 'order' ? 'by order' : 'by merchant'})`,
    );
  }

  async generateRevenueReport(
    dto: ExportRequestDto,
    adminId: string,
    ip?: string,
  ): Promise<ExportFile> {
    this.validateRange(dto);
    const from = new Date(dto.dateFrom);
    const to = new Date(`${dto.dateTo}T23:59:59.999Z`);

    const [
      completedOrderRows,
      adFeeAgg,
      completedOrders,
      pendingOrders,
      adStatus,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          paymentStatus: 'completed',
          createdAt: { gte: from, lte: to },
        },
        select: { totalAmount: true, createdAt: true },
        take: MAX_EXPORT_ROWS,
      }),
      this.prisma.adPayment.aggregate({
        where: {
          paymentStatus: 'completed',
          createdAt: { gte: from, lte: to },
        },
        _sum: { amount: true },
      }),
      this.prisma.order.count({
        where: {
          paymentStatus: 'completed',
          createdAt: { gte: from, lte: to },
        },
      }),
      this.prisma.order.count({
        where: {
          paymentStatus: 'pending',
          createdAt: { gte: from, lte: to },
        },
      }),
      this.prisma.adPayment.groupBy({
        by: ['paymentStatus'],
        _count: { _all: true },
        where: { createdAt: { gte: from, lte: to } },
      }),
    ]);

    let totalRevenue = 0;
    let totalCommission = 0;
    const getRate = await this.buildRateLookup();
    for (const o of completedOrderRows) {
      const amount = toNumber(o.totalAmount);
      totalRevenue += amount;
      const rate = getRate(o.createdAt);
      totalCommission += (amount * rate) / 100;
    }
    const orderCount = completedOrderRows.length;
    const adFeeRevenue = toNumber(adFeeAgg._sum.amount);
    const totalIncome = totalCommission + adFeeRevenue;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    const adCompleted = adStatus.find((s) => s.paymentStatus === 'completed');
    const adPending = adStatus.find((s) => s.paymentStatus === 'pending');
    const adRefunded = adStatus.find((s) => s.paymentStatus === 'refunded');

    const header = ['Metric', 'Value'];
    const rows: (string | number)[][] = [
      ['Date From', dto.dateFrom],
      ['Date To', dto.dateTo],
      ['Total Revenue', fmtExportCurrency(totalRevenue)],
      ['Total Commission', fmtExportCurrency(totalCommission)],
      ['Ad Fee Revenue', fmtExportCurrency(adFeeRevenue)],
      ['Total Income', fmtExportCurrency(totalIncome)],
      ['Avg Order Value', fmtExportCurrency(avgOrderValue)],
      ['Net Revenue', fmtExportCurrency(totalRevenue - totalCommission)],
      ['Completed Orders', completedOrders],
      ['Pending Orders', pendingOrders],
      ['Ad Completed', adCompleted?._count._all ?? 0],
      ['Ad Pending', adPending?._count._all ?? 0],
      ['Ad Refunded', adRefunded?._count._all ?? 0],
    ];

    if (completedOrderRows.length >= MAX_EXPORT_ROWS) {
      rows.push([
        'Warning',
        `Revenue figures are based on the first ${MAX_EXPORT_ROWS.toLocaleString()} completed orders only. Actual totals may be higher.`,
      ]);
    }

    const buffer = this.encode(header, rows, dto.format);
    await this.audit(adminId, 'revenue', dto, rows.length, ip);

    return this.payload(
      dto.dateFrom,
      dto.dateTo,
      dto.format,
      rows.length,
      buffer,
      'revenue',
    );
  }

  async generatePayoutReport(
    dto: ExportRequestDto,
    adminId: string,
    ip?: string,
  ): Promise<ExportFile> {
    this.validateRange(dto);

    let merchantName = 'all';
    if (dto.merchantId) {
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: dto.merchantId },
        select: { shopName: true },
      });
      merchantName = merchant?.shopName ?? 'Unknown';

      const payoutItems = await this.prisma.payoutItem.findMany({
        where: {
          payout: {
            merchantId: dto.merchantId,
            periodStart: {
              gte: new Date(dto.dateFrom),
              lte: new Date(`${dto.dateTo}T23:59:59.999Z`),
            },
          },
        },
        select: {
          orderAmount: true,
          commissionAmount: true,
          payout: {
            select: {
              status: true,
              processedAt: true,
              periodStart: true,
            },
          },
          order: {
            select: { orderNumber: true, totalAmount: true },
          },
        },
        orderBy: [{ payout: { periodStart: 'asc' } }],
        take: MAX_EXPORT_ROWS,
      });

      const header = [
        'Period',
        'Merchant',
        'Order Number',
        'Commission Rate',
        'Total',
        'Commission',
        'Net',
        'Status',
        'Payment Date',
      ];
      const rows: (string | number)[][] = (
        payoutItems as PayoutExportItem[]
      ).map((item) => {
        const order = item.order;
        const payout = item.payout;
        const amount = toNumber(order.totalAmount);
        const commission = toNumber(item.commissionAmount);
        return [
          payout.periodStart.toISOString().slice(0, 7),
          merchantName,
          order.orderNumber,
          amount > 0 ? `${fmtDecimal((commission / amount) * 100)}%` : '0%',
          fmtExportCurrency(amount),
          fmtExportCurrency(commission),
          fmtExportCurrency(amount - commission),
          payout.status,
          payout.processedAt
            ? payout.processedAt.toISOString().slice(0, 10)
            : '-',
        ];
      });
      if (payoutItems.length >= MAX_EXPORT_ROWS) {
        rows.push([
          'Warning',
          '',
          '',
          '',
          '',
          `Results truncated at ${MAX_EXPORT_ROWS.toLocaleString()} rows. Narrow your date range for complete data.`,
          '',
          '',
          '',
        ]);
      }
      const buffer = this.encode(header, rows, dto.format);
      await this.audit(adminId, 'payout', dto, rows.length, ip);
      const dateRange = `${this.getDateString(dto.dateFrom)}-${this.getDateString(dto.dateTo)}`;
      const generationDate = this.getDateString(new Date());
      const filename = `payout report(for ${merchantName})${dateRange}(${generationDate})`;
      return {
        filename,
        mimeType:
          dto.format === ExportFormat.XLSX
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'text/csv',
        content: buffer.toString('base64'),
      };
    }

    const header = [
      'Period',
      'Merchant',
      'Order Number',
      'Commission Rate',
      'Total',
      'Commission',
      'Net',
      'Status',
      'Payment Date',
    ];

    const payoutItems = await this.prisma.payoutItem.findMany({
      where: {
        payout: {
          periodStart: {
            gte: new Date(dto.dateFrom),
            lte: new Date(`${dto.dateTo}T23:59:59.999Z`),
          },
        },
      },
      select: {
        orderAmount: true,
        commissionAmount: true,
        payout: {
          select: {
            status: true,
            processedAt: true,
            periodStart: true,
            merchant: { select: { shopName: true } },
          },
        },
        order: {
          select: { orderNumber: true, totalAmount: true, createdAt: true },
        },
      },
      orderBy: [
        { payout: { periodStart: 'asc' } },
        { payout: { merchant: { shopName: 'asc' } } },
        { order: { createdAt: 'asc' } },
      ],
      take: MAX_EXPORT_ROWS,
    });

    const rows: (string | number)[][] = (payoutItems as PayoutExportItem[]).map(
      (item) => {
        const order = item.order;
        const payout = item.payout;
        const amount = toNumber(order.totalAmount);
        const commission = toNumber(item.commissionAmount);
        return [
          payout.periodStart.toISOString().slice(0, 7),
          payout.merchant?.shopName ?? 'Unknown',
          order.orderNumber,
          amount > 0 ? `${fmtDecimal((commission / amount) * 100)}%` : '0%',
          fmtExportCurrency(amount),
          fmtExportCurrency(commission),
          fmtExportCurrency(amount - commission),
          payout.status,
          payout.processedAt
            ? payout.processedAt.toISOString().slice(0, 10)
            : '-',
        ];
      },
    );

    if (payoutItems.length >= MAX_EXPORT_ROWS) {
      rows.push([
        'Warning',
        '',
        '',
        '',
        '',
        `Results truncated at ${MAX_EXPORT_ROWS.toLocaleString()} rows. Filter by merchant for complete data.`,
        '',
        '',
        '',
      ]);
    }

    const buffer = this.encode(header, rows, dto.format);
    await this.audit(adminId, 'payout', dto, rows.length, ip);

    const dateRange = `${this.getDateString(dto.dateFrom)}-${this.getDateString(dto.dateTo)}`;
    const generationDate = this.getDateString(new Date());
    const filename = `payout report(for all)${dateRange}(${generationDate})`;
    return {
      filename,
      mimeType:
        dto.format === ExportFormat.XLSX
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv',
      content: buffer.toString('base64'),
    };
  }

  /**
   * Stream a commission report directly to the HTTP response.
   *
   * The export endpoints return a file stream (Content-Type / Content-Disposition)
   * rather than a JSON envelope, so they bypass the global TransformInterceptor by
   * writing to the raw Express `Response` object.
   */
  private stream(
    filename: string,
    mimeType: string,
    buffer: Buffer,
    res: Response,
  ): void {
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  async streamCommissionReport(
    dto: ExportRequestDto,
    adminId: string,
    ip: string | undefined,
    res: Response,
  ): Promise<void> {
    const file = await this.generateCommissionReport(dto, adminId, ip);
    const buffer = Buffer.from(file.content, 'base64');
    this.stream(file.filename, file.mimeType, buffer, res);
  }

  async streamRevenueReport(
    dto: ExportRequestDto,
    adminId: string,
    ip: string | undefined,
    res: Response,
  ): Promise<void> {
    const file = await this.generateRevenueReport(dto, adminId, ip);
    const buffer = Buffer.from(file.content, 'base64');
    this.stream(file.filename, file.mimeType, buffer, res);
  }

  async streamPayoutReport(
    dto: ExportRequestDto,
    adminId: string,
    ip: string | undefined,
    res: Response,
  ): Promise<void> {
    const file = await this.generatePayoutReport(dto, adminId, ip);
    const buffer = Buffer.from(file.content, 'base64');
    this.stream(file.filename, file.mimeType, buffer, res);
  }
}
