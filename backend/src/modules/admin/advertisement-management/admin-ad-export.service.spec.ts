/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { AdminAdExportService } from './admin-ad-export.service';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

type MockPrisma = Record<string, Record<string, jest.Mock>>;

describe('AdminAdExportService', () => {
  let service: AdminAdExportService;
  let prisma: MockPrisma;

  const completedAd = {
    id: 'a1',
    shop: { name: 'Shop A' },
    title: 'Summer sale',
    feeSetting: { placement: 'homepage_banner', tier: 'premium' },
    approvalStatus: 'approved',
    paymentAmount: new Prisma.Decimal('50.00'),
    adPayments: [],
    createdAt: new Date('2024-06-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    prisma = {
      advertisement: { findMany: jest.fn() },
      adFeeHistory: { findMany: jest.fn() },
      auditLog: { create: jest.fn() },
    };

    service = new AdminAdExportService(prisma as unknown as PrismaService);
  });

  it('exports ad performance with the exact DD_05 headers', async () => {
    prisma.advertisement.findMany.mockResolvedValue([completedAd]);
    prisma.auditLog.create.mockResolvedValue({});

    const csv = await service.exportAdPerformance(
      {
        dateFrom: '2024-06-01',
        dateTo: '2024-06-30',
        format: 'csv',
      },
      'admin1',
    );

    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(
      'Shop,Title,Placement,Tier,Status,Impressions,Clicks,CTR (%),Fee Paid,Revenue',
    );
    expect(lines[1]).toBe(
      'Shop A,Summer sale,homepage_banner,premium,approved,0,0,0.00,50.00,50.00',
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'admin1',
        action: 'EXPORT_GENERATED',
        entityType: 'Advertisement',
        newValue: expect.objectContaining({
          reportType: 'ad_performance',
          format: 'csv',
          rowCount: 1,
        }),
      }),
    });
  });

  it('exports submission history including refund amounts', async () => {
    prisma.advertisement.findMany.mockResolvedValue([
      {
        ...completedAd,
        approvalStatus: 'rejected',
        rejectionReason: 'Bad content',
        approver: { name: 'Admin One' },
        approvedAt: new Date('2024-06-02T00:00:00.000Z'),
        paymentAmount: null,
        adPayments: [
          {
            amount: new Prisma.Decimal('50.00'),
            paymentStatus: 'refunded',
            refundAmount: new Prisma.Decimal('20.00'),
          },
        ],
      },
    ]);
    prisma.auditLog.create.mockResolvedValue({});

    const csv = await service.exportSubmissionHistory(
      { dateFrom: '2024-06-01', dateTo: '2024-06-30', format: 'csv' },
      'admin1',
    );

    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(
      'Shop,Title,Placement,Tier,Submitted,Status,Rejection Reason,Reviewed By,Reviewed At,Fee Paid,Refund Amount',
    );
    expect(lines[1]).toContain(',2024-06-02T00:00:00.000Z,0.00,20.00');
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        newValue: expect.objectContaining({
          reportType: 'submission_history',
          rowCount: 1,
        }),
      }),
    });
  });

  it('exports fee history, quoting cells with commas and quotes', async () => {
    prisma.adFeeHistory.findMany.mockResolvedValue([
      {
        id: 'h1',
        setting: { placement: 'homepage_banner', tier: 'premium' },
        changedByAdmin: { name: 'Admin One' },
        oldDailyRate: new Prisma.Decimal('10.00'),
        newDailyRate: new Prisma.Decimal('12.50'),
        oldDurationDays: 5,
        newDurationDays: 7,
        oldMaxAds: 3,
        newMaxAds: 4,
        changeReason: 'Rate "bump", urgent',
        effectiveFrom: new Date('2024-07-01T00:00:00.000Z'),
        createdAt: new Date('2024-06-15T00:00:00.000Z'),
      },
    ]);
    prisma.auditLog.create.mockResolvedValue({});

    const csv = await service.exportFeeHistory(
      {
        dateFrom: '2024-06-01',
        dateTo: '2024-06-30',
        format: 'csv',
      },
      'admin1',
    );

    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(
      'Date,Placement,Tier,Old Rate,New Rate,Old Duration,New Duration,Old Max Ads,New Max Ads,Changed By,Reason,Effective From',
    );
    expect(lines[1]).toContain('"Rate ""bump"", urgent"');
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        newValue: expect.objectContaining({
          reportType: 'fee_history',
          format: 'csv',
          rowCount: 1,
        }),
      }),
    });
  });

  it('rejects an inverted date range on ad performance export', async () => {
    await expect(
      service.exportAdPerformance(
        { dateFrom: '2024-06-30', dateTo: '2024-06-01', format: 'csv' },
        'admin1',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
