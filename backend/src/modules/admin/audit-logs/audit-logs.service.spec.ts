import { AuditLogsService } from './audit-logs.service';

interface MockPrisma {
  auditLog: {
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
  };
}

const mockPrisma: MockPrisma = {
  auditLog: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
};

describe('AuditLogsService', () => {
  let service: AuditLogsService;

  beforeEach(() => {
    service = new AuditLogsService(mockPrisma as never);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated audit logs', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { id: '1', action: 'CREATE' },
      ]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by action', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.findAll({ action: 'CREATE', page: 1, limit: 10 });

      const call = mockPrisma.auditLog.findMany.mock.calls[0] as never[];
      const opts = call[0] as { where: { action: string } };
      expect(opts.where.action).toBe('CREATE');
    });

    it('should filter by userId', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.findAll({ userId: 'user-1', page: 1, limit: 10 });

      const call = mockPrisma.auditLog.findMany.mock.calls[0] as never[];
      const opts = call[0] as { where: { userId: string } };
      expect(opts.where.userId).toBe('user-1');
    });
  });

  describe('logAction', () => {
    it('should create audit log', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: '1' });

      await service.logAction({
        userId: 'user-1',
        action: 'CREATE',
        entityType: 'Product',
      });

      const call = mockPrisma.auditLog.create.mock.calls[0] as never[];
      const opts = call[0] as {
        data: { userId: string; action: string; entityType: string };
      };
      expect(opts.data.userId).toBe('user-1');
      expect(opts.data.action).toBe('CREATE');
      expect(opts.data.entityType).toBe('Product');
    });
  });
});
