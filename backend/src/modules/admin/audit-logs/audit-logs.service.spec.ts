import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AuditLogsService } from './audit-logs.service';
import {
  AuditSortBy,
  ListAuditLogsDto,
  SortOrder,
} from './dto/list-audit-logs.dto';
import { ExportAuditLogsDto, ExportFormat } from './dto/export-audit-logs.dto';
import {
  AUDIT_ACTION_CATALOG,
  AUDIT_ENTITY_TYPE_CATALOG,
} from './audit-filter-catalog';

type AnyMock = jest.Mock<(...args: any[]) => any>;

interface MockPrisma {
  auditLog: {
    findMany: AnyMock;
    findUnique: AnyMock;
    count: AnyMock;
    create: AnyMock;
    deleteMany: AnyMock;
  };
}

const createMockPrisma = (): MockPrisma => ({
  auditLog: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
});

const makeDto = (overrides: Partial<ListAuditLogsDto> = {}): ListAuditLogsDto =>
  Object.assign(new ListAuditLogsDto(), overrides);

const oldRow = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  action: 'merchant.approve',
  entityType: 'Merchant',
  entityId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  oldValue: { license_status: 'pending', password: 'leaked' },
  newValue: { license_status: 'approved' },
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
  createdAt: new Date('2026-08-25T14:30:00.000Z'),
  user: {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: 'Ada',
    email: 'ada@example.com',
    roleCode: 'admin',
  },
};

const CHROME_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new AuditLogsService(prisma as never);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('uses default query: created_at DESC, page 1, limit 50 with actor join', async () => {
      prisma.auditLog.findMany.mockResolvedValue([oldRow]);
      prisma.auditLog.count.mockResolvedValue(1);

      const result = await service.findAll(makeDto());

      expect(result.meta).toEqual({
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      });
      expect(result.items[0].userName).toBe('Ada');
      expect(result.items[0].userRole).toBe('admin');

      const options = (
        prisma.auditLog.findMany.mock.calls as [
          [
            {
              skip: number;
              take: number;
              orderBy: unknown;
              include: { user: { select: Record<string, unknown> } };
            },
          ],
        ]
      )[0][0];
      expect(options.skip).toBe(0);
      expect(options.take).toBe(50);
      expect(options.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
      expect(options.include.user.select).toMatchObject({
        name: true,
        email: true,
      });
    });

    it('never returns the entity id to the client', async () => {
      prisma.auditLog.findMany.mockResolvedValue([oldRow]);
      prisma.auditLog.count.mockResolvedValue(1);
      prisma.auditLog.findUnique.mockResolvedValue(oldRow);

      const list = await service.findAll(makeDto());
      const detail = await service.findOne(oldRow.id);

      expect(list.items[0]).not.toHaveProperty('entityId');
      expect(detail).not.toHaveProperty('entityId');
    });

    it('combines user/action/entity/date/IP/text filters with AND semantics', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.findAll(
        makeDto({
          userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          action: ['merchant.approve'],
          entityType: ['Merchant'],
          entityId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          ipAddress: '10.0.0.1',
          search: 'Ada',
          dateFrom: '2026-01-01',
          dateTo: '2026-01-31',
        }),
      );

      const options = (
        prisma.auditLog.findMany.mock.calls as [
          [{ where: { AND: Record<string, unknown>[] } }],
        ]
      )[0][0];
      const conditions = options.where.AND;
      expect(conditions).toHaveLength(7);
      expect(conditions).toContainEqual({
        userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      });
      expect(conditions).toContainEqual({
        action: { in: ['merchant.approve'] },
      });
      expect(conditions).toContainEqual({ entityType: { in: ['Merchant'] } });
      // Every stored spelling of the filtered IP must match, because the column
      // displays the normalized (IPv4) form.
      expect(conditions).toContainEqual({
        OR: [
          { ipAddress: { contains: '10.0.0.1' } },
          { ipAddress: { contains: '::ffff:10.0.0.1' } },
        ],
      });
      expect(conditions).toContainEqual({
        createdAt: {
          // Myanmar day boundaries: 2026-01-01 00:00 MMT and
          // 2026-01-31 23:59:59.999 MMT expressed as UTC instants.
          gte: new Date('2025-12-31T17:30:00.000Z'),
          lte: new Date('2026-01-31T17:29:59.999Z'),
        },
      });
      expect(conditions.some((c) => Array.isArray(c.OR))).toBe(true);
    });

    it('matches pre-rename delete rows when filtering by AUDIT_LOG_DELETE', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.findAll(makeDto({ action: ['AUDIT_LOG_DELETE'] }));

      const options = (
        prisma.auditLog.findMany.mock.calls as [
          [{ where: { AND: Record<string, unknown>[] } }],
        ]
      )[0][0];
      expect(options.where.AND).toContainEqual({
        action: { in: ['AUDIT_LOG_DELETE', 'audit.admin.delete'] },
      });
    });

    it('shows the IPv4 spelling of loopback rows in the list', async () => {
      prisma.auditLog.findMany.mockResolvedValue([
        { ...oldRow, ipAddress: '::1' },
      ]);
      prisma.auditLog.count.mockResolvedValue(1);

      const result = await service.findAll(makeDto());

      expect(result.items[0].ipAddress).toBe('127.0.0.1');
    });

    it('matches every stored spelling of the filtered IP', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.findAll(makeDto({ ipAddress: '127.0.0.1' }));

      const options = (
        prisma.auditLog.findMany.mock.calls as [
          [{ where: { AND: Record<string, unknown>[] } }],
        ]
      )[0][0];
      expect(options.where.AND).toContainEqual({
        OR: [
          { ipAddress: { contains: '127.0.0.1' } },
          { ipAddress: { contains: '::1' } },
          { ipAddress: { contains: '::ffff:127.0.0.1' } },
        ],
      });
    });

    it('matches a partial IPv4 search against canonical and legacy loopback rows', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.findAll(makeDto({ ipAddress: '127' }));

      const options = (
        prisma.auditLog.findMany.mock.calls as [
          [{ where: { AND: Record<string, unknown>[] } }],
        ]
      )[0][0];
      expect(options.where.AND).toContainEqual({
        OR: [
          { ipAddress: { contains: '127' } },
          { ipAddress: { contains: '::1' } },
        ],
      });
    });

    it('throws BadRequestException for partial date range', async () => {
      await expect(
        service.findAll(makeDto({ dateFrom: '2026-01-01' })),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when dateTo is before dateFrom', async () => {
      await expect(
        service.findAll(
          makeDto({ dateFrom: '2026-02-01', dateTo: '2026-01-01' }),
        ),
      ).rejects.toThrow('dateTo must be greater than or equal to dateFrom');
    });

    it('rejects datetime values without a UTC offset', async () => {
      await expect(
        service.findAll(
          makeDto({
            dateFrom: '2026-01-01T10:00:00',
            dateTo: '2026-01-02T10:00:00',
          }),
        ),
      ).rejects.toThrow('UTC offset');
    });

    it('maps single-value defaults and custom sort to the expected order', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.findAll(
        makeDto({
          page: 2,
          limit: 25,
          sortBy: AuditSortBy.ACTION,
          sortOrder: SortOrder.ASC,
        }),
      );

      const options = (
        prisma.auditLog.findMany.mock.calls as [
          [{ skip: number; take: number; orderBy: unknown }],
        ]
      )[0][0];
      expect(options.skip).toBe(25);
      expect(options.take).toBe(25);
      expect(options.orderBy).toEqual([{ action: 'asc' }, { id: 'asc' }]);
    });
  });

  describe('findOne', () => {
    it('returns full detail with actor and masks sensitive JSON keys', async () => {
      prisma.auditLog.findUnique.mockResolvedValue(oldRow);

      const result = await service.findOne(oldRow.id);

      expect(result.userName).toBe('Ada');
      expect(result.oldValue).toEqual({
        license_status: 'pending',
        password: '***',
      });
      expect(result.userAgent).toBe('Mozilla/5.0');
      expect(result.summary).toBe('Merchant Approve');
    });

    it('normalizes the stored IP for the detail modal', async () => {
      prisma.auditLog.findUnique.mockResolvedValue({
        ...oldRow,
        ipAddress: '::ffff:192.168.1.1',
      });

      const result = await service.findOne(oldRow.id);

      expect(result.ipAddress).toBe('192.168.1.1');
    });

    it('throws NotFoundException when the record is missing', async () => {
      prisma.auditLog.findUnique.mockResolvedValue(null);

      await expect(service.findOne(oldRow.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('renders null actor as null (System at presentation time)', async () => {
      prisma.auditLog.findUnique.mockResolvedValue({
        ...oldRow,
        userId: null,
        user: null,
      });

      const result = await service.findOne(oldRow.id);

      expect(result.userId).toBeNull();
      expect(result.userName).toBeNull();
      expect(result.userRole).toBeNull();
    });
  });

  describe('getFilterOptions', () => {
    it('offers the whole action and entity type catalogs even when the table is empty', async () => {
      prisma.auditLog.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getFilterOptions();

      expect(result.actions).toEqual(
        [...AUDIT_ACTION_CATALOG].sort((a, b) => a.localeCompare(b)),
      );
      expect(result.entityTypes).toEqual(
        [...AUDIT_ENTITY_TYPE_CATALOG].sort((a, b) => a.localeCompare(b)),
      );
    });

    it('unions catalog values with recorded-only ones, sorted and deduped', async () => {
      prisma.auditLog.findMany
        .mockResolvedValueOnce([
          { action: 'AD_APPROVED' },
          { action: 'LEGACY_ONLY' },
        ])
        .mockResolvedValueOnce([
          { entityType: 'merchant' },
          { entityType: 'LegacyEntity' },
        ]);

      const result = await service.getFilterOptions();

      // AD_APPROVED / merchant are already in the catalogs, LEGACY_* are not.
      expect(result.actions).toHaveLength(AUDIT_ACTION_CATALOG.length + 1);
      expect(result.actions).toEqual(
        expect.arrayContaining([
          'PAYOUT_PROCESSED',
          'PLACE_ORDER',
          'AUDIT_LOG_DELETE',
          'AD_APPROVED',
          'LEGACY_ONLY',
        ]),
      );
      expect(new Set(result.actions).size).toBe(result.actions.length);
      expect(result.actions).toEqual(
        [...result.actions].sort((a, b) => a.localeCompare(b)),
      );

      expect(result.entityTypes).toHaveLength(
        AUDIT_ENTITY_TYPE_CATALOG.length + 1,
      );
      expect(result.entityTypes).toEqual(
        expect.arrayContaining([
          'merchant',
          'order',
          'Advertisement',
          'Payout',
          'LegacyEntity',
        ]),
      );
      expect(new Set(result.entityTypes).size).toBe(result.entityTypes.length);
      expect(result.entityTypes).toEqual(
        [...result.entityTypes].sort((a, b) => a.localeCompare(b)),
      );
    });

    it('hides the pre-rename spelling of the delete event from the options', async () => {
      prisma.auditLog.findMany
        .mockResolvedValueOnce([{ action: 'audit.admin.delete' }])
        .mockResolvedValueOnce([{ entityType: 'AuditLog' }]);

      const result = await service.getFilterOptions();

      expect(result.actions).not.toContain('audit.admin.delete');
      expect(result.actions).toContain('AUDIT_LOG_DELETE');
      expect(result.actions).toHaveLength(AUDIT_ACTION_CATALOG.length);
    });
  });

  describe('exportCsv', () => {
    const exportDto = () =>
      Object.assign(new ExportAuditLogsDto(), { format: ExportFormat.CSV });

    it('produces a CSV with the defined columns under the row cap', async () => {
      prisma.auditLog.count.mockResolvedValue(1);
      prisma.auditLog.findMany.mockResolvedValue([
        {
          ...oldRow,
          userAgent: CHROME_USER_AGENT,
          newValue: {
            license_status: 'approved',
            targetAmount: '100000.00',
            commissionRate: '12.00%',
          },
        },
      ]);

      const file = await service.exportCsv(exportDto());

      expect(file.filename).toMatch(/^audit-logs-\d{4}-\d{2}-\d{2}\.csv$/);
      const text = file.content.toString('utf8');
      // Column A must read exactly "Timestamp": the file starts with a single
      // UTF-8 BOM (consumed by Excel as an encoding signature), followed
      // immediately by the header with no stray characters before it.
      expect(file.content.subarray(0, 3)).toEqual(
        Buffer.from([0xef, 0xbb, 0xbf]),
      );
      expect(file.content.subarray(3, 15).toString('utf8')).toBe(
        '"Timestamp",',
      );
      const expectedHeader = [
        'Timestamp',
        'Actor Name',
        'Actor Email',
        'Actor Role',
        'Action',
        'Entity Type',
        'Old Value',
        'New Value',
        'IP Address',
        'User Agent',
      ]
        .map((column) => `"${column}"`)
        .join(',');
      expect(text.replace(/^\uFEFF/, '').split('\r\n')[0]).toBe(expectedHeader);
      expect(text).toContain('Timestamp');
      expect(text).toContain('Actor Name');
      expect(text).toContain('Old Value');
      // Entity ID is deliberately not part of the export output.
      expect(text).not.toContain('Entity ID');
      expect(text).toContain('ada@example.com');
      expect(text).toContain('"***"');
      expect(text).not.toContain('leaked');
      expect(text).toContain('100,000');
      expect(text).toContain('12%');
      expect(text).not.toContain('100000.00');
      expect(text).not.toContain('12.00%');
      // The Timestamp column is rendered in Myanmar time, never raw UTC.
      expect(text).toContain('2026-08-25 21:00:00.000 MMT');
      expect(text).not.toContain('2026-08-25T14:30:00.000Z');
      // The User Agent column carries the parsed one-line summary (client
      // type | browser | device - no OS), never the raw browser string.
      expect(text).toContain('"Web Browser | Chrome 120 | Desktop"');
      expect(text).not.toContain(CHROME_USER_AGENT);
      // Export must be read-only: no create/delete invoked.
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
      expect(prisma.auditLog.deleteMany).not.toHaveBeenCalled();
    });

    it('bounds a date-only range on Myanmar day boundaries', async () => {
      prisma.auditLog.count.mockResolvedValue(0);
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.exportCsv(
        Object.assign(exportDto(), {
          dateFrom: '2026-01-01',
          dateTo: '2026-01-31',
        }),
      );

      const options = (
        prisma.auditLog.findMany.mock.calls as [
          [{ where: { AND: Record<string, unknown>[] } }],
        ]
      )[0][0];
      expect(options.where.AND).toContainEqual({
        createdAt: {
          gte: new Date('2025-12-31T17:30:00.000Z'),
          lte: new Date('2026-01-31T17:29:59.999Z'),
        },
      });
    });

    it('exports the normalized IP address', async () => {
      prisma.auditLog.count.mockResolvedValue(1);
      prisma.auditLog.findMany.mockResolvedValue([
        { ...oldRow, ipAddress: '::1' },
      ]);

      const file = await service.exportCsv(exportDto());
      const text = file.content.toString('utf8');

      expect(text).toContain('127.0.0.1');
      expect(text).not.toContain('::1');
    });

    it("names the file with the selected range and today's date", async () => {
      prisma.auditLog.count.mockResolvedValue(0);
      prisma.auditLog.findMany.mockResolvedValue([]);

      const file = await service.exportCsv(
        Object.assign(exportDto(), {
          dateFrom: '2026-01-01',
          dateTo: '2026-01-31',
        }),
      );

      // "Today" in the filename is the Myanmar calendar day, not the UTC one.
      const mmtNow = new Date(Date.now() + (6 * 60 + 30) * 60 * 1000);
      const today = mmtNow.toISOString().slice(0, 10);
      expect(file.filename).toMatch(
        new RegExp(`^audit-logs-2026-01-01-2026-01-31\\(${today}\\)\\.csv$`),
      );
    });

    it('throws BadRequestException when the range exceeds 365 days', async () => {
      await expect(
        service.exportCsv(
          Object.assign(exportDto(), {
            dateFrom: '2024-01-01',
            dateTo: '2025-02-01',
          }),
        ),
      ).rejects.toThrow('Date range cannot exceed 365 days');
    });

    it('throws BadRequestException when rows exceed 10,000 without generating a file', async () => {
      prisma.auditLog.count.mockResolvedValue(10_001);

      await expect(service.exportCsv(exportDto())).rejects.toThrow(
        'Export exceeds maximum row limit',
      );
      expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
      expect(prisma.auditLog.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes eligible 90+ day records and returns exact counts', async () => {
      const cutoffCompatible = new Date('2020-01-01T00:00:00.000Z');
      prisma.auditLog.count.mockResolvedValue(2);
      prisma.auditLog.findMany
        .mockResolvedValueOnce([
          { id: 'id-1', createdAt: cutoffCompatible },
          { id: 'id-2', createdAt: cutoffCompatible },
        ])
        .mockResolvedValueOnce([]);
      prisma.auditLog.deleteMany.mockResolvedValue({ count: 2 });
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-event' });

      const result = await service.remove({ olderThanDays: 90 }, 'admin-1');

      expect(result).toEqual({ deletedRecords: 2, deletedFiles: 0 });
      expect(prisma.auditLog.deleteMany).toHaveBeenCalledTimes(1);
      const createCall = (
        prisma.auditLog.create.mock.calls as [
          [{ data: { userId: string; action: string } }],
        ]
      )[0][0];
      expect(createCall.data.userId).toBe('admin-1');
      expect(createCall.data.action).toBe('AUDIT_LOG_DELETE');
    });

    it('throws BadRequestException when threshold is below 90 days', async () => {
      await expect(
        service.remove({ olderThanDays: 89 }, 'admin-1'),
      ).rejects.toThrow('Minimum retention period is 90 days');
      expect(prisma.auditLog.deleteMany).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when no eligible targets exist', async () => {
      prisma.auditLog.count.mockResolvedValue(0);

      await expect(
        service.remove({ olderThanDays: 90 }, 'admin-1'),
      ).rejects.toThrow('No records or files eligible for deletion');
      expect(prisma.auditLog.deleteMany).not.toHaveBeenCalled();
    });

    it('rejects atomic explicit-ID requests when a target is young and deletes nothing', async () => {
      prisma.auditLog.findMany.mockResolvedValue([
        { id: 'old-id', createdAt: new Date('2020-01-01T00:00:00.000Z') },
        { id: 'young-id', createdAt: new Date() },
      ]);

      await expect(
        service.remove(
          { olderThanDays: 90, recordIds: ['old-id', 'young-id'] },
          'admin-1',
        ),
      ).rejects.toThrow('Records younger than 90 days cannot be deleted');
      expect(prisma.auditLog.deleteMany).not.toHaveBeenCalled();
    });

    it('rejects atomic explicit-ID requests when a target is missing', async () => {
      prisma.auditLog.findMany.mockResolvedValue([
        { id: 'old-id', createdAt: new Date('2020-01-01T00:00:00.000Z') },
      ]);

      await expect(
        service.remove(
          { olderThanDays: 90, recordIds: ['old-id', 'missing-id'] },
          'admin-1',
        ),
      ).rejects.toThrow('do not exist');
      expect(prisma.auditLog.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('logAction', () => {
    it('creates an audit log entry', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: '1' });

      await service.logAction({
        userId: 'user-1',
        action: 'CREATE',
        entityType: 'Product',
      });

      const options = (
        prisma.auditLog.create.mock.calls as [
          [{ data: { userId: string; action: string; entityType: string } }],
        ]
      )[0][0];
      expect(options.data.userId).toBe('user-1');
      expect(options.data.action).toBe('CREATE');
      expect(options.data.entityType).toBe('Product');
    });

    it('supports system-generated actions with a null user', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: '2' });

      await service.logAction({
        userId: null,
        action: 'system.maintenance',
        entityType: 'System',
      });

      const options = (
        prisma.auditLog.create.mock.calls as [
          [{ data: { userId: string | null } }],
        ]
      )[0][0];
      expect(options.data.userId).toBeNull();
    });
  });
});
