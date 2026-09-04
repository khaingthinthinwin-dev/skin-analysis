import { AdminController } from './admin.controller';

const mockAdminService = {
  getDashboardStats: jest.fn(),
  getUsers: jest.fn(),
  toggleUserStatus: jest.fn(),
  getReviews: jest.fn(),
  approveReview: jest.fn(),
  deleteReview: jest.fn(),
  getReviewReports: jest.fn(),
  resolveReport: jest.fn(),
  deactivateProduct: jest.fn(),
  getflaggedContent: jest.fn(),
  getMerchants: jest.fn(),
  approveMerchant: jest.fn(),
  rejectMerchant: jest.fn(),
  getAdvertisements: jest.fn(),
  approveAdvertisement: jest.fn(),
  rejectAdvertisement: jest.fn(),
  getAdFeeSettings: jest.fn(),
  updateAdFeeSetting: jest.fn(),
  getCommissionSettings: jest.fn(),
  updateCommissionSettings: jest.fn(),
  getPayouts: jest.fn(),
  processPayout: jest.fn(),
  getAuditLogs: jest.fn(),
};

describe('AdminController', () => {
  let controller: AdminController;

  beforeEach(() => {
    controller = new AdminController(mockAdminService as never);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get dashboard stats', async () => {
    mockAdminService.getDashboardStats.mockResolvedValue({ totalUsers: 10 });
    const result = await controller.getDashboardStats();
    expect(result.totalUsers).toBe(10);
  });

  it('should get users', async () => {
    mockAdminService.getUsers.mockResolvedValue({ items: [] });
    const result = await controller.getUsers({});
    expect(result.items).toBeDefined();
  });

  it('should toggle user status', async () => {
    mockAdminService.toggleUserStatus.mockResolvedValue({});
    await controller.toggleUserStatus('user-1', false);
    expect(mockAdminService.toggleUserStatus).toHaveBeenCalledWith(
      'user-1',
      false,
    );
  });

  it('should get reviews', async () => {
    mockAdminService.getReviews.mockResolvedValue({ items: [] });
    const result = await controller.getReviews({});
    expect(result.items).toBeDefined();
  });

  it('should approve review', async () => {
    mockAdminService.approveReview.mockResolvedValue({});
    await controller.approveReview('review-1');
    expect(mockAdminService.approveReview).toHaveBeenCalledWith('review-1');
  });

  it('should delete review', async () => {
    mockAdminService.deleteReview.mockResolvedValue({});
    await controller.deleteReview('review-1');
    expect(mockAdminService.deleteReview).toHaveBeenCalledWith('review-1');
  });

  it('should get review reports', async () => {
    mockAdminService.getReviewReports.mockResolvedValue({ items: [] });
    const result = await controller.getReviewReports({});
    expect(result.items).toBeDefined();
  });

  it('should resolve report', async () => {
    mockAdminService.resolveReport.mockResolvedValue({});
    await controller.resolveReport('report-1', { action: 'resolved' });
    expect(mockAdminService.resolveReport).toHaveBeenCalledWith(
      'report-1',
      'resolved',
      undefined,
    );
  });

  it('should deactivate product', async () => {
    mockAdminService.deactivateProduct.mockResolvedValue({});
    await controller.deactivateProduct('product-1');
    expect(mockAdminService.deactivateProduct).toHaveBeenCalledWith(
      'product-1',
    );
  });

  it('should get flagged content', async () => {
    mockAdminService.getflaggedContent.mockResolvedValue({ items: [] });
    const result = await controller.getFlaggedContent({});
    expect(result.items).toBeDefined();
  });

  it('should get merchants', async () => {
    mockAdminService.getMerchants.mockResolvedValue({ items: [] });
    const result = await controller.getMerchants({});
    expect(result.items).toBeDefined();
  });

  it('should approve merchant', async () => {
    mockAdminService.approveMerchant.mockResolvedValue({});
    await controller.approveMerchant('merchant-1', 'admin-1');
    expect(mockAdminService.approveMerchant).toHaveBeenCalledWith(
      'merchant-1',
      'admin-1',
    );
  });

  it('should reject merchant', async () => {
    mockAdminService.rejectMerchant.mockResolvedValue({});
    await controller.rejectMerchant('merchant-1', {
      reason: 'Bad license',
      adminId: 'admin-1',
    });
    expect(mockAdminService.rejectMerchant).toHaveBeenCalledWith(
      'merchant-1',
      'Bad license',
      'admin-1',
    );
  });

  it('should get advertisements', async () => {
    mockAdminService.getAdvertisements.mockResolvedValue({ items: [] });
    const result = await controller.getAdvertisements({});
    expect(result.items).toBeDefined();
  });

  it('should approve advertisement', async () => {
    mockAdminService.approveAdvertisement.mockResolvedValue({});
    await controller.approveAdvertisement('ad-1');
    expect(mockAdminService.approveAdvertisement).toHaveBeenCalledWith('ad-1');
  });

  it('should reject advertisement', async () => {
    mockAdminService.rejectAdvertisement.mockResolvedValue({});
    await controller.rejectAdvertisement('ad-1', 'Inappropriate');
    expect(mockAdminService.rejectAdvertisement).toHaveBeenCalledWith(
      'ad-1',
      'Inappropriate',
    );
  });

  it('should get ad fee settings', async () => {
    mockAdminService.getAdFeeSettings.mockResolvedValue([]);
    const result = await controller.getAdFeeSettings();
    expect(result).toBeDefined();
  });

  it('should update ad fee setting', async () => {
    mockAdminService.updateAdFeeSetting.mockResolvedValue({});
    await controller.updateAdFeeSetting('setting-1', 20);
    expect(mockAdminService.updateAdFeeSetting).toHaveBeenCalledWith(
      'setting-1',
      20,
    );
  });

  it('should get commission settings', async () => {
    mockAdminService.getCommissionSettings.mockResolvedValue({
      commissionRate: 10,
    });
    const result = await controller.getCommissionSettings();
    expect(result.commissionRate).toBe(10);
  });

  it('should update commission settings', async () => {
    mockAdminService.updateCommissionSettings.mockResolvedValue({});
    await controller.updateCommissionSettings(15, 'admin-1');
    expect(mockAdminService.updateCommissionSettings).toHaveBeenCalledWith(
      15,
      'admin-1',
    );
  });

  it('should get payouts', async () => {
    mockAdminService.getPayouts.mockResolvedValue({ items: [] });
    const result = await controller.getPayouts({});
    expect(result.items).toBeDefined();
  });

  it('should process payout', async () => {
    mockAdminService.processPayout.mockResolvedValue({});
    await controller.processPayout('payout-1', 'admin-1');
    expect(mockAdminService.processPayout).toHaveBeenCalledWith(
      'payout-1',
      'admin-1',
    );
  });

  it('should get audit logs', async () => {
    mockAdminService.getAuditLogs.mockResolvedValue({ items: [] });
    const result = await controller.getAuditLogs({});
    expect(result.items).toBeDefined();
  });
});
