import { AdminService } from './admin.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

const mockPrisma = {
  user: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  merchant: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  review: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  reviewReport: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  product: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  advertisement: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  adFeeSetting: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  commissionSetting: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  payout: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(() => {
    service = new AdminService(mockPrisma as never);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardStats', () => {
    it('should return dashboard stats', async () => {
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.merchant.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2);
      mockPrisma.advertisement.count.mockResolvedValue(3);
      mockPrisma.reviewReport.count.mockResolvedValue(1);

      const result = await service.getDashboardStats();

      expect(result.totalUsers).toBe(10);
      expect(result.totalMerchants).toBe(5);
      expect(result.pendingMerchants).toBe(2);
      expect(result.pendingAds).toBe(3);
      expect(result.pendingReviewReports).toBe(1);
    });
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: '1', email: 'test@test.com' },
      ]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.getUsers({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by role', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getUsers({ role: 'buyer', page: 1, limit: 10 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ roleCode: 'buyer' }),
        }),
      );
    });

    it('should filter by is_active', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getUsers({ is_active: true, page: 1, limit: 10 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });

  describe('toggleUserStatus', () => {
    it('should toggle user status', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.user.update.mockResolvedValue({});

      await service.toggleUserStatus('1', false);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.toggleUserStatus('nonexistent', true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getReviews', () => {
    it('should return paginated reviews', async () => {
      mockPrisma.review.findMany.mockResolvedValue([{ id: '1' }]);
      mockPrisma.review.count.mockResolvedValue(1);

      const result = await service.getReviews({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by is_approved', async () => {
      mockPrisma.review.findMany.mockResolvedValue([]);
      mockPrisma.review.count.mockResolvedValue(0);

      await service.getReviews({ is_approved: true, page: 1, limit: 10 });

      expect(mockPrisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isApproved: true }),
        }),
      );
    });
  });

  describe('approveReview', () => {
    it('should approve review', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.review.update.mockResolvedValue({});

      await service.approveReview('1');

      expect(mockPrisma.review.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isApproved: true },
      });
    });

    it('should throw NotFoundException if review not found', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(null);

      await expect(service.approveReview('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteReview', () => {
    it('should delete review', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.review.delete.mockResolvedValue({});

      await service.deleteReview('1');

      expect(mockPrisma.review.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException if review not found', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(null);

      await expect(service.deleteReview('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getReviewReports', () => {
    it('should return paginated reports', async () => {
      mockPrisma.reviewReport.findMany.mockResolvedValue([{ id: '1' }]);
      mockPrisma.reviewReport.count.mockResolvedValue(1);

      const result = await service.getReviewReports({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
    });

    it('should filter by status', async () => {
      mockPrisma.reviewReport.findMany.mockResolvedValue([]);
      mockPrisma.reviewReport.count.mockResolvedValue(0);

      await service.getReviewReports({ status: 'pending', page: 1, limit: 10 });

      expect(mockPrisma.reviewReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'pending' }),
        }),
      );
    });
  });

  describe('resolveReport', () => {
    it('should resolve report', async () => {
      mockPrisma.reviewReport.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.reviewReport.update.mockResolvedValue({});

      await service.resolveReport('1', 'resolved', 'Fixed');

      expect(mockPrisma.reviewReport.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({ status: 'resolved' }),
      });
    });

    it('should throw NotFoundException if report not found', async () => {
      mockPrisma.reviewReport.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveReport('nonexistent', 'resolved'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivateProduct', () => {
    it('should deactivate product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.product.update.mockResolvedValue({});

      await service.deactivateProduct('1');

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.deactivateProduct('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getflaggedContent', () => {
    it('should return flagged products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ id: '1' }]);
      mockPrisma.product.count.mockResolvedValue(1);

      const result = await service.getflaggedContent({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
    });
  });

  describe('getMerchants', () => {
    it('should return paginated merchants', async () => {
      mockPrisma.merchant.findMany.mockResolvedValue([{ id: '1' }]);
      mockPrisma.merchant.count.mockResolvedValue(1);

      const result = await service.getMerchants({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
    });

    it('should filter by status', async () => {
      mockPrisma.merchant.findMany.mockResolvedValue([]);
      mockPrisma.merchant.count.mockResolvedValue(0);

      await service.getMerchants({ status: 'pending', page: 1, limit: 10 });

      expect(mockPrisma.merchant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ licenseStatus: 'pending' }),
        }),
      );
    });
  });

  describe('approveMerchant', () => {
    it('should approve merchant', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: '1',
        licenseStatus: 'pending',
      });
      mockPrisma.$transaction.mockResolvedValue([{ id: '1' }, { id: 'rr-1' }]);

      await service.approveMerchant('1', 'admin-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if merchant not found', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);

      await expect(service.approveMerchant('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if already approved', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({
        id: '1',
        licenseStatus: 'approved',
      });

      await expect(service.approveMerchant('1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('rejectMerchant', () => {
    it('should reject merchant', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.merchant.update.mockResolvedValue({});

      await service.rejectMerchant('1', 'Invalid license', 'admin-1');

      expect(mockPrisma.merchant.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({ licenseStatus: 'rejected' }),
      });
    });

    it('should throw NotFoundException if merchant not found', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);

      await expect(
        service.rejectMerchant('nonexistent', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAdvertisements', () => {
    it('should return paginated ads', async () => {
      mockPrisma.advertisement.findMany.mockResolvedValue([{ id: '1' }]);
      mockPrisma.advertisement.count.mockResolvedValue(1);

      const result = await service.getAdvertisements({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
    });

    it('should filter by status', async () => {
      mockPrisma.advertisement.findMany.mockResolvedValue([]);
      mockPrisma.advertisement.count.mockResolvedValue(0);

      await service.getAdvertisements({
        status: 'pending',
        page: 1,
        limit: 10,
      });

      expect(mockPrisma.advertisement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ approvalStatus: 'pending' }),
        }),
      );
    });
  });

  describe('approveAdvertisement', () => {
    it('should approve advertisement', async () => {
      mockPrisma.advertisement.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.advertisement.update.mockResolvedValue({});

      await service.approveAdvertisement('1');

      expect(mockPrisma.advertisement.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({ approvalStatus: 'approved' }),
      });
    });

    it('should throw NotFoundException if ad not found', async () => {
      mockPrisma.advertisement.findUnique.mockResolvedValue(null);

      await expect(service.approveAdvertisement('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('rejectAdvertisement', () => {
    it('should reject advertisement', async () => {
      mockPrisma.advertisement.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.advertisement.update.mockResolvedValue({});

      await service.rejectAdvertisement('1', 'Inappropriate');

      expect(mockPrisma.advertisement.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({ approvalStatus: 'rejected' }),
      });
    });

    it('should throw NotFoundException if ad not found', async () => {
      mockPrisma.advertisement.findUnique.mockResolvedValue(null);

      await expect(
        service.rejectAdvertisement('nonexistent', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAdFeeSettings', () => {
    it('should return ad fee settings', async () => {
      mockPrisma.adFeeSetting.findMany.mockResolvedValue([
        { id: '1', dailyRate: 10 },
      ]);

      const result = await service.getAdFeeSettings();

      expect(result).toHaveLength(1);
    });
  });

  describe('updateAdFeeSetting', () => {
    it('should update ad fee setting', async () => {
      mockPrisma.adFeeSetting.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.adFeeSetting.update.mockResolvedValue({});

      await service.updateAdFeeSetting('1', 20);

      expect(mockPrisma.adFeeSetting.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { dailyRate: 20 },
      });
    });

    it('should throw NotFoundException if setting not found', async () => {
      mockPrisma.adFeeSetting.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAdFeeSetting('nonexistent', 20),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCommissionSettings', () => {
    it('should return commission settings', async () => {
      mockPrisma.commissionSetting.findFirst.mockResolvedValue({
        commissionRate: 10,
      });

      const result = await service.getCommissionSettings();

      expect(result.commissionRate).toBe(10);
    });

    it('should return default rate if no settings', async () => {
      mockPrisma.commissionSetting.findFirst.mockResolvedValue(null);

      const result = await service.getCommissionSettings();

      expect(result.commissionRate).toBe(0);
    });
  });

  describe('updateCommissionSettings', () => {
    it('should update existing commission settings', async () => {
      mockPrisma.commissionSetting.findFirst.mockResolvedValue({ id: '1' });
      mockPrisma.commissionSetting.update.mockResolvedValue({});

      await service.updateCommissionSettings(15, 'admin-1');

      expect(mockPrisma.commissionSetting.update).toHaveBeenCalled();
    });

    it('should create new commission settings if none exist', async () => {
      mockPrisma.commissionSetting.findFirst.mockResolvedValue(null);
      mockPrisma.commissionSetting.create.mockResolvedValue({});

      await service.updateCommissionSettings(15, 'admin-1');

      expect(mockPrisma.commissionSetting.create).toHaveBeenCalled();
    });
  });

  describe('getPayouts', () => {
    it('should return paginated payouts', async () => {
      mockPrisma.payout.findMany.mockResolvedValue([{ id: '1' }]);
      mockPrisma.payout.count.mockResolvedValue(1);

      const result = await service.getPayouts({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
    });

    it('should filter by status', async () => {
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.payout.count.mockResolvedValue(0);

      await service.getPayouts({ status: 'pending', page: 1, limit: 10 });

      expect(mockPrisma.payout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'pending' }),
        }),
      );
    });
  });

  describe('processPayout', () => {
    it('should process payout', async () => {
      mockPrisma.payout.findUnique.mockResolvedValue({
        id: '1',
        status: 'pending',
      });
      mockPrisma.payout.update.mockResolvedValue({});

      await service.processPayout('1', 'admin-1');

      expect(mockPrisma.payout.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({ status: 'completed' }),
      });
    });

    it('should throw NotFoundException if payout not found', async () => {
      mockPrisma.payout.findUnique.mockResolvedValue(null);

      await expect(service.processPayout('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if payout not pending', async () => {
      mockPrisma.payout.findUnique.mockResolvedValue({
        id: '1',
        status: 'completed',
      });

      await expect(service.processPayout('1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([{ id: '1' }]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await service.getAuditLogs({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
    });

    it('should filter by action', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.getAuditLogs({ action: 'CREATE', page: 1, limit: 10 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { contains: 'CREATE' },
          }),
        }),
      );
    });

    it('should filter by userId', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.getAuditLogs({ userId: 'user-1', page: 1, limit: 10 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });
  });
});
