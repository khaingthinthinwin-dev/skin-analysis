import { AdminController } from './admin.controller';
import {
  ReviewAction,
  MerchantStatus,
  ReportAction,
} from './dto/moderation.dto';

const mockAdminService = {
  getDashboardStats: jest.fn(),
  getReviews: jest.fn(),
  getReviewById: jest.fn(),
  moderateReview: jest.fn(),
  reportReview: jest.fn(),
  deleteReview: jest.fn(),
  bulkModerateReviews: jest.fn(),
  bulkDeleteReviews: jest.fn(),
  getMerchants: jest.fn(),
  getMerchantById: jest.fn(),
  moderateMerchant: jest.fn(),
  getProducts: jest.fn(),
  getProductById: jest.fn(),
  moderateProduct: jest.fn(),
  bulkModerateProducts: jest.fn(),
  getUsers: jest.fn(),
  getUserById: jest.fn(),
  moderateUser: jest.fn(),
  getReports: jest.fn(),
  getReportById: jest.fn(),
  updateReportStatus: jest.fn(),
  deleteReport: jest.fn(),
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

  it('should get reviews', async () => {
    mockAdminService.getReviews.mockResolvedValue({ items: [] });
    const result = await controller.getReviews({});
    expect(result.items).toBeDefined();
  });

  it('should get review by id', async () => {
    mockAdminService.getReviewById.mockResolvedValue({ id: 'r1' });
    const result = await controller.getReviewById('r1');
    expect(result.id).toBe('r1');
  });

  it('should moderate review', async () => {
    mockAdminService.moderateReview.mockResolvedValue({});
    await controller.moderateReview('r1', { action: ReviewAction.APPROVE }, {
      id: 'admin-1',
    } as never);
    expect(mockAdminService.moderateReview).toHaveBeenCalledWith(
      'r1',
      { action: ReviewAction.APPROVE },
      'admin-1',
    );
  });

  it('should delete review', async () => {
    mockAdminService.deleteReview.mockResolvedValue({});
    await controller.deleteReview('r1', { id: 'admin-1' } as never);
    expect(mockAdminService.deleteReview).toHaveBeenCalledWith('r1', 'admin-1');
  });

  it('should get merchants', async () => {
    mockAdminService.getMerchants.mockResolvedValue({ items: [] });
    const result = await controller.getMerchants({});
    expect(result.items).toBeDefined();
  });

  it('should get merchant by id', async () => {
    mockAdminService.getMerchantById.mockResolvedValue({ id: 'm1' });
    const result = await controller.getMerchantById('m1');
    expect(result.id).toBe('m1');
  });

  it('should moderate merchant', async () => {
    mockAdminService.moderateMerchant.mockResolvedValue({});
    await controller.moderateMerchant(
      'm1',
      { status: MerchantStatus.APPROVED },
      { id: 'admin-1' } as never,
    );
    expect(mockAdminService.moderateMerchant).toHaveBeenCalledWith(
      'm1',
      { status: MerchantStatus.APPROVED },
      'admin-1',
    );
  });

  it('should get products', async () => {
    mockAdminService.getProducts.mockResolvedValue({ items: [] });
    const result = await controller.getProducts({});
    expect(result.items).toBeDefined();
  });

  it('should get product by id', async () => {
    mockAdminService.getProductById.mockResolvedValue({ id: 'p1' });
    const result = await controller.getProductById('p1');
    expect(result.id).toBe('p1');
  });

  it('should moderate product', async () => {
    mockAdminService.moderateProduct.mockResolvedValue({});
    await controller.moderateProduct('p1', { isActive: true }, {
      id: 'admin-1',
    } as never);
    expect(mockAdminService.moderateProduct).toHaveBeenCalledWith(
      'p1',
      { isActive: true },
      'admin-1',
    );
  });

  it('should get users', async () => {
    mockAdminService.getUsers.mockResolvedValue({ items: [] });
    const result = await controller.getUsers({});
    expect(result.items).toBeDefined();
  });

  it('should get user by id', async () => {
    mockAdminService.getUserById.mockResolvedValue({ id: 'u1' });
    const result = await controller.getUserById('u1');
    expect(result.id).toBe('u1');
  });

  it('should moderate user', async () => {
    mockAdminService.moderateUser.mockResolvedValue({});
    await controller.moderateUser('u1', { isActive: true }, {
      id: 'admin-1',
    } as never);
    expect(mockAdminService.moderateUser).toHaveBeenCalledWith(
      'u1',
      { isActive: true },
      'admin-1',
    );
  });

  it('should get reports', async () => {
    mockAdminService.getReports.mockResolvedValue({ items: [] });
    const result = await controller.getReports({});
    expect(result.items).toBeDefined();
  });

  it('should get report by id', async () => {
    mockAdminService.getReportById.mockResolvedValue({ id: 'rp1' });
    const result = await controller.getReportById('rp1');
    expect(result.id).toBe('rp1');
  });

  it('should update report status', async () => {
    mockAdminService.updateReportStatus.mockResolvedValue({});
    await controller.updateReportStatus(
      'rp1',
      { status: ReportAction.RESOLVED },
      { id: 'admin-1' } as never,
    );
    expect(mockAdminService.updateReportStatus).toHaveBeenCalledWith(
      'rp1',
      { status: ReportAction.RESOLVED },
      'admin-1',
    );
  });

  it('should delete report', async () => {
    mockAdminService.deleteReport.mockResolvedValue({});
    await controller.deleteReport('rp1', { id: 'admin-1' } as never);
    expect(mockAdminService.deleteReport).toHaveBeenCalledWith(
      'rp1',
      'admin-1',
    );
  });

  it('should get audit logs', async () => {
    mockAdminService.getAuditLogs.mockResolvedValue({ items: [] });
    const result = await controller.getAuditLogs({});
    expect(result.items).toBeDefined();
  });
});
