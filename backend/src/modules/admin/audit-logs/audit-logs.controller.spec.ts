import { AuditLogsController } from './audit-logs.controller';

interface MockAuditLogsService {
  findAll: jest.Mock;
}

const mockAuditLogsService: MockAuditLogsService = {
  findAll: jest.fn(),
};

describe('AuditLogsController', () => {
  let controller: AuditLogsController;

  beforeEach(() => {
    controller = new AuditLogsController(mockAuditLogsService as never);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return audit logs', async () => {
      mockAuditLogsService.findAll.mockResolvedValue({ items: [] });
      const result = await controller.findAll({});
      expect(result.items).toBeDefined();
    });
  });
});
