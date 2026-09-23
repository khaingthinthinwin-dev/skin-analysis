import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ExportFormat, ReportType } from './enums';
import { ExportAdPerformanceDto } from './dto/export-ad-performance.dto';
import { ExportSubmissionHistoryDto } from './dto/export-submission-history.dto';
import { ExportFeeHistoryDto } from './dto/export-fee-history.dto';

const AD_PERFORMANCE_HEADERS = [
  'Shop',
  'Title',
  'Placement',
  'Tier',
  'Status',
  'Impressions',
  'Clicks',
  'CTR (%)',
  'Fee Paid',
  'Revenue',
];

const SUBMISSION_HISTORY_HEADERS = [
  'Shop',
  'Title',
  'Placement',
  'Tier',
  'Submitted',
  'Status',
  'Rejection Reason',
  'Reviewed By',
  'Reviewed At',
  'Fee Paid',
  'Refund Amount',
];

const FEE_HISTORY_HEADERS = [
  'Date',
  'Placement',
  'Tier',
  'Old Rate',
  'New Rate',
  'Old Duration',
  'New Duration',
  'Old Max Ads',
  'New Max Ads',
  'Changed By',
  'Reason',
  'Effective From',
];

@Injectable()
export class AdminAdExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportAdPerformance(
    dto: ExportAdPerformanceDto,
    adminId: string,
  ): Promise<string> {
    const { start, end } = this.validateDateRange(dto.dateFrom, dto.dateTo);

    const where: Prisma.AdvertisementWhereInput = { createdAt: { gte: start } };
    where.createdAt = { gte: start, lte: end };
    if (dto.placement?.length) {
      where.feeSetting = { placement: { in: dto.placement } };
    }
    if (dto.tier?.length) {
      where.feeSetting = { tier: { in: dto.tier } };
    }
    if (dto.status?.length) {
      where.approvalStatus = { in: dto.status };
    }

    const ads = await this.prisma.advertisement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        feeSetting: true,
        shop: { select: { name: true } },
        adPayments: {
          where: { paymentStatus: 'completed' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { amount: true },
        },
      },
    });

    const rows = ads.map((ad) => {
      const fee = ad.paymentAmount ?? ad.adPayments[0]?.amount ?? undefined;
      const feePaid = fee ? fee.toFixed(2) : '0.00';
      const impressions = 0;
      const clicks = 0;
      const ctr =
        impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
      return [
        ad.shop.name,
        ad.title,
        ad.feeSetting?.placement ?? '',
        ad.feeSetting?.tier ?? '',
        ad.approvalStatus,
        impressions.toString(),
        clicks.toString(),
        ctr,
        feePaid,
        feePaid,
      ];
    });

    const csv = this.toCsv(AD_PERFORMANCE_HEADERS, rows);
    await this.logExport(adminId, ReportType.AD_PERFORMANCE, rows.length, dto);
    return csv;
  }

  async exportSubmissionHistory(
    dto: ExportSubmissionHistoryDto,
    adminId: string,
  ): Promise<string> {
    const { start, end } = this.validateDateRange(dto.dateFrom, dto.dateTo);

    const where: Prisma.AdvertisementWhereInput = {
      createdAt: { gte: start, lte: end },
    };
    if (dto.shop) {
      where.shop = { name: { contains: dto.shop, mode: 'insensitive' } };
    }

    const ads = await this.prisma.advertisement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        feeSetting: true,
        shop: { select: { name: true } },
        approver: { select: { name: true } },
        adPayments: {
          select: { amount: true, paymentStatus: true, refundAmount: true },
        },
      },
    });

    const rows = ads.map((ad) => {
      const paid = ad.paymentAmount ?? undefined;
      const refunded = ad.adPayments.reduce(
        (sum, payment) =>
          sum +
          (payment.paymentStatus === 'refunded' && payment.refundAmount
            ? payment.refundAmount.toNumber()
            : 0),
        0,
      );
      return [
        ad.shop.name,
        ad.title,
        ad.feeSetting?.placement ?? '',
        ad.feeSetting?.tier ?? '',
        ad.createdAt.toISOString(),
        ad.approvalStatus,
        ad.rejectionReason ?? '',
        ad.approver?.name ?? '',
        ad.approvedAt?.toISOString() ?? '',
        paid ? paid.toFixed(2) : '0.00',
        refunded > 0 ? refunded.toFixed(2) : '0.00',
      ];
    });

    const csv = this.toCsv(SUBMISSION_HISTORY_HEADERS, rows);
    await this.logExport(
      adminId,
      ReportType.SUBMISSION_HISTORY,
      rows.length,
      dto,
    );
    return csv;
  }

  async exportFeeHistory(
    dto: ExportFeeHistoryDto,
    adminId: string,
  ): Promise<string> {
    const { start, end } = this.validateDateRange(dto.dateFrom, dto.dateTo);

    const where: Prisma.AdFeeHistoryWhereInput = {
      createdAt: { gte: start, lte: end },
    };
    if (dto.placement?.length) {
      where.setting = { placement: { in: dto.placement } };
    }
    if (dto.tier?.length) {
      where.setting = { tier: { in: dto.tier } };
    }

    const history = await this.prisma.adFeeHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        setting: { select: { placement: true, tier: true } },
        changedByAdmin: { select: { name: true } },
      },
    });

    const rows = history.map((item) => [
      item.createdAt.toISOString(),
      item.setting.placement,
      item.setting.tier,
      item.oldDailyRate?.toFixed(2) ?? '',
      item.newDailyRate.toFixed(2),
      item.oldDurationDays?.toString() ?? '',
      item.newDurationDays.toString(),
      item.oldMaxAds?.toString() ?? '',
      item.newMaxAds.toString(),
      item.changedByAdmin?.name ?? '',
      item.changeReason ?? '',
      item.effectiveFrom.toISOString(),
    ]);

    const csv = this.toCsv(FEE_HISTORY_HEADERS, rows);
    await this.logExport(adminId, ReportType.FEE_HISTORY, rows.length, dto);
    return csv;
  }

  // ─── Private Helpers ───────────────────────────────────────────────────

  private validateDateRange(dateFrom: string, dateTo: string) {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (end < start) {
      throw new BadRequestException('dateTo must be on or after dateFrom');
    }
    const days = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (days > 365) {
      throw new BadRequestException('Date range must not exceed 365 days');
    }
    return {
      start,
      end: /^\d{4}-\d{2}-\d{2}$/.test(dateTo)
        ? new Date(`${dateTo}T23:59:59.999Z`)
        : end,
    };
  }

  private toCsv(headers: string[], rows: string[][]): string {
    const lines = [headers.map((header) => this.escapeCsv(header))];
    for (const row of rows) {
      lines.push(row.map((cell) => this.escapeCsv(cell)));
    }
    return lines.map((line) => line.join(',')).join('\r\n');
  }

  private escapeCsv(value: string): string {
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private async logExport(
    adminId: string,
    reportType: string,
    rowCount: number,
    dto: {
      dateFrom: string;
      dateTo: string;
      placement?: string[];
      tier?: string[];
      shop?: string;
      status?: string[];
      format?: string;
    },
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'EXPORT_GENERATED',
        entityType: 'Advertisement',
        newValue: {
          reportType,
          format: dto.format ?? ExportFormat.CSV,
          rowCount,
          dateFrom: dto.dateFrom,
          dateTo: dto.dateTo,
          placement: dto.placement ?? [],
          tier: dto.tier ?? [],
          shop: dto.shop ?? null,
          status: dto.status ?? [],
        },
      },
    });
  }
}
