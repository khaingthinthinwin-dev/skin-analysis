import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AuditLogsService } from './audit-logs.service';
import { ExportAuditLogsDto, ExportFormat } from './dto/export-audit-logs.dto';

type AnyMock = jest.Mock<(...args: never[]) => Promise<unknown>>;

interface MockPrisma {
  auditLog: {
    findMany: AnyMock;
    count: AnyMock;
    create: AnyMock;
  };
}

const ADMIN_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const createMockPrisma = (): MockPrisma => ({
  auditLog: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
});

/** Distinctive values that belong to exported rows, not to the audit event. */
const exportedRow = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  userId: ADMIN_ID,
  action: 'merchant.approve',
  entityType: 'Merchant',
  entityId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  oldValue: { licenseStatus: 'pending' },
  newValue: { licenseStatus: 'approved' },
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0 (row-user-agent)',
  createdAt: new Date('2026-08-25T14:30:00.000Z'),
  user: {
    id: ADMIN_ID,
    name: 'Ada',
    email: 'ada@example.com',
    roleCode: 'admin',
  },
};

const exportDto = (overrides: Partial<ExportAuditLogsDto> = {}) =>
  Object.assign(new ExportAuditLogsDto(), {
    format: ExportFormat.CSV,
    ...overrides,
  });

/** The `data` object handed to prisma.auditLog.create for the self-audit row. */
function auditEventData(prisma: MockPrisma): Record<string, unknown> {
  const calls = prisma.auditLog.create.mock.calls as unknown as [
    [{ data: Record<string, unknown> }],
  ];
  return calls[0][0].data;
}

describe('AuditLogsService export self-audit', () => {
  let service: AuditLogsService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new AuditLogsService(prisma as never);
    jest.clearAllMocks();
  });

  it('appends an AUDIT_EXPORT event with the exported filters and row count', async () => {
    prisma.auditLog.count.mockResolvedValue(2);
    prisma.auditLog.findMany.mockResolvedValue([exportedRow, exportedRow]);

    await service.exportCsv(
      exportDto({
        userId: ADMIN_ID,
        action: ['merchant.approve'],
        entityType: ['Merchant'],
        entityId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        ipAddress: '10.0.0.1',
        search: 'Ada',
      }),
      ADMIN_ID,
    );

    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    const data = auditEventData(prisma);
    expect(data.userId).toBe(ADMIN_ID);
    expect(data.action).toBe('AUDIT_EXPORT');
    expect(data.entityType).toBe('AuditLog');
    expect(data.entityId).toBeNull();
    expect(data.newValue).toEqual({
      format: 'csv',
      rowCount: 2,
      filters: {
        userId: ADMIN_ID,
        action: ['merchant.approve'],
        entityType: ['Merchant'],
        entityId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        ipAddress: '10.0.0.1',
        search: 'Ada',
      },
    });
  });

  it('records only the filters that were actually supplied', async () => {
    prisma.auditLog.count.mockResolvedValue(0);
    prisma.auditLog.findMany.mockResolvedValue([]);

    await service.exportCsv(exportDto(), ADMIN_ID);

    expect(auditEventData(prisma).newValue).toEqual({
      format: 'csv',
      rowCount: 0,
      filters: {},
    });
  });

  it('records filter metadata only, never the exported row data', async () => {
    prisma.auditLog.count.mockResolvedValue(1);
    prisma.auditLog.findMany.mockResolvedValue([exportedRow]);

    await service.exportCsv(exportDto(), ADMIN_ID);

    const serialized = JSON.stringify(auditEventData(prisma).newValue);
    expect(serialized).not.toContain('ada@example.com');
    expect(serialized).not.toContain('Mozilla/5.0');
    expect(serialized).not.toContain('192.168.1.1');
    expect(serialized).not.toContain('licenseStatus');
    expect(serialized).not.toContain('Merchant');
  });

  it('does not append an event when the row cap rejects the export', async () => {
    prisma.auditLog.count.mockResolvedValue(10_001);

    await expect(service.exportCsv(exportDto(), ADMIN_ID)).rejects.toThrow(
      'Export exceeds maximum row limit',
    );

    // DD_AUDIT_06: an oversized export produces no file and no audit mutation.
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it('does not append an event when no acting admin is supplied', async () => {
    prisma.auditLog.count.mockResolvedValue(1);
    prisma.auditLog.findMany.mockResolvedValue([exportedRow]);

    await service.exportCsv(exportDto());

    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('still returns the CSV when recording the event fails', async () => {
    prisma.auditLog.count.mockResolvedValue(1);
    prisma.auditLog.findMany.mockResolvedValue([exportedRow]);
    prisma.auditLog.create.mockRejectedValue(new Error('audit write failed'));
    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const file = await service.exportCsv(exportDto(), ADMIN_ID);

    expect(file.filename).toMatch(/^audit-logs-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(file.content.toString('utf8')).toContain('Timestamp');
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to record audit export event'),
    );

    errorSpy.mockRestore();
  });
});
