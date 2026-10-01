import { AuditLogsController } from './audit-logs.controller';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';
import { ExportAuditLogsDto, ExportFormat } from './dto/export-audit-logs.dto';
import { DeleteAuditLogsDto } from './dto/delete-audit-logs.dto';

interface MockAuditLogsService {
  findAll: jest.Mock;
  findOne: jest.Mock;
  getFilterOptions: jest.Mock;
  exportCsv: jest.Mock;
  remove: jest.Mock;
}

const mockAuditLogsService: MockAuditLogsService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  getFilterOptions: jest.fn(),
  exportCsv: jest.fn(),
  remove: jest.fn(),
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
    it('returns audit logs', async () => {
      mockAuditLogsService.findAll.mockResolvedValue({
        items: [],
        meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });

      const result = await controller.findAll(new ListAuditLogsDto());

      expect(result.items).toEqual([]);
      expect(mockAuditLogsService.findAll).toHaveBeenCalledTimes(1);
    });

    it('propagates BadRequestException for malformed query', async () => {
      mockAuditLogsService.findAll.mockRejectedValue(new Error('bad request'));

      await expect(controller.findAll(new ListAuditLogsDto())).rejects.toThrow(
        'bad request',
      );
    });
  });

  describe('getFilterOptions', () => {
    it('returns filter options', async () => {
      mockAuditLogsService.getFilterOptions.mockResolvedValue({
        actions: ['merchant.approve'],
        entityTypes: ['Merchant'],
      });

      const result = await controller.getFilterOptions();

      expect(result.actions).toEqual(['merchant.approve']);
      expect(result.entityTypes).toEqual(['Merchant']);
    });

    it('declares the static `filters` route before `:id`', () => {
      // Nest registers routes in method-definition order; `filters` must come
      // first or it would be captured by the `:id` param route.
      const methodNames = Object.getOwnPropertyNames(
        Object.getPrototypeOf(controller),
      ).filter((name) => name !== 'constructor');
      expect(methodNames.indexOf('getFilterOptions')).toBeLessThan(
        methodNames.indexOf('findOne'),
      );
    });
  });

  describe('findOne', () => {
    it('returns detail', async () => {
      mockAuditLogsService.findOne.mockResolvedValue({ id: 'log-1' });

      const result = await controller.findOne('log-1');

      expect(result).toEqual({ id: 'log-1' });
      expect(mockAuditLogsService.findOne).toHaveBeenCalledWith('log-1');
    });
  });

  describe('exportCsv', () => {
    it('streams the generated CSV with attachment headers', async () => {
      const content = Buffer.from('Timestamp\r\n');
      mockAuditLogsService.exportCsv.mockResolvedValue({
        filename: 'audit-logs-2026-09-23.csv',
        content,
      });

      const res = {
        set: jest.fn(),
        end: jest.fn(),
      };

      const dto = Object.assign(new ExportAuditLogsDto(), {
        format: ExportFormat.CSV,
      });

      await controller.exportCsv(
        dto,
        { id: 'admin-1', email: 'a@example.com', roleCode: 'admin' },
        res as never,
      );

      // The acting admin is forwarded so the export can be self-audited.
      expect(mockAuditLogsService.exportCsv).toHaveBeenCalledWith(
        dto,
        'admin-1',
      );
      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition':
          'attachment; filename="audit-logs-2026-09-23.csv"',
        'Content-Length': content.length,
      });
      expect(res.end).toHaveBeenCalledWith(content);
    });

    it('propagates row-limit BadRequestException without writing the response', async () => {
      mockAuditLogsService.exportCsv.mockRejectedValue(
        new Error('Export exceeds maximum row limit'),
      );
      const res = { set: jest.fn(), end: jest.fn() };

      await expect(
        controller.exportCsv(
          Object.assign(new ExportAuditLogsDto(), { format: ExportFormat.CSV }),
          { id: 'admin-1', email: 'a@example.com', roleCode: 'admin' },
          res as never,
        ),
      ).rejects.toThrow('Export exceeds maximum row limit');
      expect(res.set).not.toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('delegates to the service with the current admin id', async () => {
      mockAuditLogsService.remove.mockResolvedValue({
        deletedRecords: 12,
        deletedFiles: 0,
      });

      const dto = Object.assign(new DeleteAuditLogsDto(), {
        olderThanDays: 90,
      });
      const result = await controller.remove(dto, {
        id: 'admin-1',
        email: 'a@example.com',
        roleCode: 'admin',
      });

      expect(result).toEqual({ deletedRecords: 12, deletedFiles: 0 });
      expect(mockAuditLogsService.remove).toHaveBeenCalledWith(dto, 'admin-1');
    });
  });
});
