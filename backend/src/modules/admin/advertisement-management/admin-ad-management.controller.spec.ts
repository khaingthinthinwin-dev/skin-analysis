import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AdminAdManagementController } from './admin-ad-management.controller';
import { AdminAdManagementService } from './admin-ad-management.service';
import { AdminAdExportService } from './admin-ad-export.service';

describe('AdminAdManagementController', () => {
  let controller: AdminAdManagementController;
  let service: Record<string, jest.Mock>;
  let exportService: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      listAds: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      viewAdDetail: jest.fn().mockResolvedValue({ id: 'a1' }),
      approveAd: jest
        .fn()
        .mockResolvedValue({ id: 'a1', approvalStatus: 'approved' }),
      rejectAd: jest
        .fn()
        .mockResolvedValue({ id: 'a1', approvalStatus: 'rejected' }),
      bulkApproveAds: jest.fn().mockResolvedValue({ approved: 1, failed: 0 }),
      bulkRejectAds: jest.fn().mockResolvedValue({ rejected: 1, failed: 0 }),
      listFeeSettings: jest.fn().mockResolvedValue([]),
      createFeeSetting: jest.fn().mockResolvedValue({ id: 'fs1' }),
      updateFeeSetting: jest.fn().mockResolvedValue({ id: 'fs1' }),
      deactivateFeeSetting: jest
        .fn()
        .mockResolvedValue({ id: 'fs1', isActive: false }),
      listFeeHistory: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      getRevenueAnalytics: jest.fn().mockResolvedValue({ summary: {} }),
    };
    exportService = {
      exportAdPerformance: jest.fn().mockResolvedValue('header\r\nrow'),
      exportSubmissionHistory: jest.fn().mockResolvedValue('header\r\nrow'),
      exportFeeHistory: jest.fn().mockResolvedValue('header\r\nrow'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAdManagementController],
      providers: [
        { provide: AdminAdManagementService, useValue: service },
        { provide: AdminAdExportService, useValue: exportService },
      ],
    }).compile();

    controller = module.get(AdminAdManagementController);
  });

  it('is guarded with JwtAuthGuard and RolesGuard and admin role', () => {
    expect(
      Reflect.getMetadata('__guards__', AdminAdManagementController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata('roles', AdminAdManagementController)).toEqual([
      'admin',
    ]);
  });

  it('delegates list ads with the query DTO', async () => {
    const query = { status: 'pending', page: 1, limit: 20 };
    const result = await controller.listAds(query);

    expect(service.listAds).toHaveBeenCalledWith(query);
    expect(result).toEqual({ data: [], meta: {} });
  });

  it('delegates approve with the current user id', async () => {
    const user = { id: 'admin1', email: 'a@a.com', roleCode: 'admin' };
    const result = await controller.approveAd('a1', user);

    expect(service.approveAd).toHaveBeenCalledWith('a1', 'admin1');
    expect(result.approvalStatus).toBe('approved');
  });

  it('delegates bulk ops with body and admin id', async () => {
    const user = { id: 'admin1', email: 'a@a.com', roleCode: 'admin' };
    await controller.bulkRejectAds(
      { ad_ids: ['a1'], rejection_reason: 'spam' },
      user,
    );

    expect(service.bulkRejectAds).toHaveBeenCalledWith(
      { ad_ids: ['a1'], rejection_reason: 'spam' },
      'admin1',
    );
  });

  it('streams ad performance export as CSV', async () => {
    const user = { id: 'admin1', email: 'a@a.com', roleCode: 'admin' };
    const res = {
      set: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    await controller.exportAdPerformance(
      { dateFrom: '2024-06-01', dateTo: '2024-06-30', format: 'csv' },
      user,
      res as unknown as Response,
    );

    expect(exportService.exportAdPerformance).toHaveBeenCalledWith(
      { dateFrom: '2024-06-01', dateTo: '2024-06-30', format: 'csv' },
      'admin1',
    );
    expect(res.set).toHaveBeenCalledWith({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ad_performance_report.csv"',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('header\r\nrow');
  });
});
