import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ExportRequestDto, ExportFormat } from './dto/export-request.dto';
import { fmtDecimal, toNumber } from './commission-revenue.util';
import { buildCsv, buildXlsx } from './file-builder';
import type { Response } from 'express';

const MAX_EXPORT_DAYS = 365;

interface ExportFile {
  filename: string;
  mimeType: string;
  content: string; // base64
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

  async generateCommissionReport(
    dto: ExportRequestDto,
    adminId: string,
    ip?: string,
  ): Promise<ExportFile> {
    this.validateRange(dto);

    const orders = await this.prisma.order.findMany({
      where: {
        paymentStatus: 'completed',
        createdAt: {
          gte: new Date(dto.dateFrom),
          lte: new Date(`${dto.dateTo}T23:59:59.999Z`),
        },
      },
      select: {
        merchantId: true,
        totalAmount: true,
        createdAt: true,
        merchant: { select: { shopName: true } },
      },
    });

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
      const rate = await this.getEffectiveRate(o.createdAt);
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

    const header = [
      'Merchant',
      'Commission Rate',
      'Orders',
      'Revenue',
      'Commission',
    ];
    const rows = Array.from(grouped.values()).map((g) => [
      g.name,
      `${fmtDecimal(g.rate)}%`,
      g.orders,
      fmtDecimal(g.revenue),
      fmtDecimal(g.commission),
    ]);

    const buffer = this.encode(header, rows, dto.format);
    await this.audit(adminId, 'commission', dto, rows.length, ip);

    return this.payload(
      dto.dateFrom,
      dto.dateTo,
      dto.format,
      rows.length,
      buffer,
      'commission',
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
    for (const o of completedOrderRows) {
      const amount = toNumber(o.totalAmount);
      totalRevenue += amount;
      const rate = await this.getEffectiveRate(o.createdAt);
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
      ['Total Revenue', fmtDecimal(totalRevenue)],
      ['Total Commission', fmtDecimal(totalCommission)],
      ['Ad Fee Revenue', fmtDecimal(adFeeRevenue)],
      ['Total Income', fmtDecimal(totalIncome)],
      ['Avg Order Value', fmtDecimal(avgOrderValue)],
      ['Net Revenue', fmtDecimal(totalRevenue - totalCommission)],
      ['Completed Orders', completedOrders],
      ['Pending Orders', pendingOrders],
      ['Ad Completed', adCompleted?._count._all ?? 0],
      ['Ad Pending', adPending?._count._all ?? 0],
      ['Ad Refunded', adRefunded?._count._all ?? 0],
    ];

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
    const payouts = await this.prisma.payout.findMany({
      where: {
        createdAt: {
          gte: new Date(dto.dateFrom),
          lte: new Date(`${dto.dateTo}T23:59:59.999Z`),
        },
      },
      include: {
        merchant: { select: { shopName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = [
      'Merchant',
      'Order Number',
      'Commission Rate',
      'Total',
      'Commission',
      'Net',
      'Status',
      'Date',
    ];

    const rows: (string | number)[][] = [];
    for (const p of payouts) {
      const rate =
        toNumber(p.totalAmount) > 0
          ? (toNumber(p.commissionAmount) / toNumber(p.totalAmount)) * 100
          : 0;
      const orders = await this.prisma.order.findMany({
        where: {
          merchantId: p.merchantId,
          paymentStatus: 'completed',
          totalAmount: p.totalAmount,
        },
        select: { id: true, orderNumber: true },
        orderBy: { createdAt: 'asc' },
      });

      if (orders.length === 0) {
        rows.push([
          p.merchant?.shopName ?? 'Unknown',
          '-',
          fmtDecimal(rate),
          fmtDecimal(p.totalAmount),
          fmtDecimal(p.commissionAmount),
          fmtDecimal(toNumber(p.totalAmount) - toNumber(p.commissionAmount)),
          p.status,
          p.createdAt.toISOString(),
        ]);
        continue;
      }

      for (const o of orders) {
        const orderAmount = toNumber(p.totalAmount);
        const commission = (orderAmount * rate) / 100;
        rows.push([
          p.merchant?.shopName ?? 'Unknown',
          o.orderNumber,
          fmtDecimal(rate),
          fmtDecimal(orderAmount),
          fmtDecimal(commission),
          fmtDecimal(orderAmount - commission),
          p.status,
          p.createdAt.toISOString(),
        ]);
      }
    }

    const buffer = this.encode(header, rows, dto.format);
    await this.audit(adminId, 'payout', dto, rows.length, ip);

    return this.payload(
      dto.dateFrom,
      dto.dateTo,
      dto.format,
      rows.length,
      buffer,
      'payout',
    );
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
