import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  AuditSortBy,
  ListAuditLogsDto,
  SortOrder,
} from './dto/list-audit-logs.dto';
import { ExportAuditLogsDto, ExportFormat } from './dto/export-audit-logs.dto';
import { DeleteAuditLogsDto } from './dto/delete-audit-logs.dto';
import { formatIpAddress } from './audit-request-context';
import { summarizeUserAgent } from './user-agent-summary';
import {
  LEGACY_AUDIT_DELETE_ACTIONS,
  mergeWithRecordedActions,
  mergeWithRecordedEntityTypes,
} from './audit-filter-catalog';

export const AUDIT_LOG_MIN_RETENTION_DAYS = 90;
export const AUDIT_LOG_EXPORT_MAX_ROWS = 10_000;
export const AUDIT_LOG_EXPORT_MAX_RANGE_DAYS = 365;
const DELETE_BATCH_SIZE = 1_000;

// Optional self-audit event for exports (BR-AUDIT-035, FDS export step 7).
const AUDIT_EXPORT_ACTION = 'AUDIT_EXPORT';
// Manual purge self-audit event, named to match the other uppercase actions.
const AUDIT_DELETE_ACTION = 'AUDIT_LOG_DELETE';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'accesstoken',
  'refreshtoken',
  'token',
  'secret',
  'credentials',
]);

const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/**
 * Audit events are stored as UTC instants, but the trail is reviewed in
 * Myanmar, so every value this module *renders* or *bounds* — date-only filter
 * ranges, the CSV `Timestamp` column and the export filename — is expressed in
 * Myanmar Time.
 *
 * MMT is a fixed UTC+06:30 with no DST, so the conversion is a plain offset
 * rather than an `Intl` time-zone lookup. That keeps the results identical on
 * every host regardless of the server's OS time zone or the runtime's ICU data:
 * a date range must mean the same Myanmar day everywhere, and a filtered or
 * exported audit timestamp must never shift depending on where it was read.
 */
const MMT_OFFSET_MINUTES = 6 * 60 + 30;
const MMT_OFFSET_SUFFIX = '+06:30';
const MS_PER_MINUTE = 60 * 1000;

const padNumber = (value: number, width = 2): string =>
  String(value).padStart(width, '0');

function toMmtInstant(date: Date): Date {
  return new Date(date.getTime() + MMT_OFFSET_MINUTES * MS_PER_MINUTE);
}

/** `2026-09-30 12:43:12.123 MMT`. */
function formatMmt(date: Date): string {
  const mmt = toMmtInstant(date);
  return (
    `${mmt.getUTCFullYear()}-${padNumber(mmt.getUTCMonth() + 1)}-${padNumber(mmt.getUTCDate())}` +
    ` ${padNumber(mmt.getUTCHours())}:${padNumber(mmt.getUTCMinutes())}:${padNumber(mmt.getUTCSeconds())}` +
    `.${padNumber(mmt.getUTCMilliseconds(), 3)} MMT`
  );
}

/** `YYYY-MM-DD` for the Myanmar calendar day that contains `date`. */
function toMmtDateStamp(date: Date): string {
  return formatMmt(date).slice(0, 10);
}

/**
 * `audit_logs.ip_address` can hold one logical address in several spellings —
 * `127.0.0.1` from the current normalizer, but `::1` or `::ffff:127.0.0.1`
 * from rows written earlier — while the column *displays*
 * `formatIpAddress(...)`. The IP filter therefore has to match every spelling
 * of the value the admin typed, or filtering on a shown value would silently
 * miss rows.
 */
function ipAddressVariants(ip: string): string[] {
  const variants = new Set<string>([ip]);
  const formatted = formatIpAddress(ip);
  if (formatted) variants.add(formatted);
  if (formatted === '127.0.0.1' || '127.0.0.1'.includes(ip)) {
    variants.add('::1');
  }
  if (IPV4_PATTERN.test(ip)) variants.add(`::ffff:${ip}`);
  return [...variants];
}

const EXPORT_NUMBER_FORMAT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const EXPORT_PERCENT_WORDS = new Set([
  'rate',
  'rates',
  'percent',
  'percentage',
  'pct',
  'ratio',
]);

const EXPORT_CURRENCY_WORDS = new Set([
  'amount',
  'price',
  'cost',
  'fee',
  'balance',
  'revenue',
  'target',
  'commission',
  'payout',
  'salary',
  'wage',
  'tax',
  'budget',
  'total',
  'refund',
  'income',
  'credit',
  'debit',
  'fund',
  'sales',
]);

const SORT_COLUMN_MAP: Record<
  AuditSortBy,
  keyof Prisma.AuditLogOrderByWithRelationInput
> = {
  [AuditSortBy.CREATED_AT]: 'createdAt',
  [AuditSortBy.ACTION]: 'action',
  [AuditSortBy.ENTITY_TYPE]: 'entityType',
};

const CSV_HEADERS = [
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
] as const;

export interface AuditLogListItem {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  entityType: string;
  summary: string;
  ipAddress: string | null;
  createdAt: Date;
}

export interface AuditLogDetail extends AuditLogListItem {
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  userAgent: string | null;
}

export interface PaginatedAuditLogs {
  items: AuditLogListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface AuditFilterOptions {
  actions: string[];
  entityTypes: string[];
}

export interface DeleteResult {
  deletedRecords: number;
  deletedFiles: number;
}

export interface CsvExportFile {
  filename: string;
  content: Buffer;
}

/** Filter values recorded on the `AUDIT_EXPORT` self-audit event. */
type ExportFilterSummary = Record<string, string | string[]>;

type AuditLogWithUser = Prisma.AuditLogGetPayload<{
  include: {
    user: { select: { id: true; name: true; email: true; roleCode: true } };
  };
}>;

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: ListAuditLogsDto): Promise<PaginatedAuditLogs> {
    const where = this.buildWhere(dto);
    const skip = (dto.page - 1) * dto.limit;
    const sortColumn = SORT_COLUMN_MAP[dto.sortBy];
    const direction = dto.sortOrder === SortOrder.ASC ? 'asc' : 'desc';

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, roleCode: true },
          },
        },
        skip,
        take: dto.limit,
        // `id` tie-breaker keeps pagination deterministic when sort values tie.
        orderBy: [{ [sortColumn]: direction }, { id: direction }],
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toListItem(row)),
      meta: {
        page: dto.page,
        limit: dto.limit,
        total,
        totalPages: Math.ceil(total / dto.limit),
      },
    };
  }

  async findOne(id: string): Promise<AuditLogDetail> {
    const row = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, roleCode: true } },
      },
    });

    if (!row) {
      throw new NotFoundException('Audit log entry not found');
    }

    const item = this.toListItem(row);
    return {
      ...item,
      oldValue: this.maskSensitive(
        row.oldValue as Record<string, unknown> | null,
      ),
      newValue: this.maskSensitive(
        row.newValue as Record<string, unknown> | null,
      ),
      userAgent: row.userAgent,
    };
  }

  async getFilterOptions(): Promise<AuditFilterOptions> {
    const [recordedActions, entityTypes] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { action: { not: '' } },
        distinct: ['action'],
        select: { action: true },
        orderBy: { action: 'asc' },
      }),
      this.prisma.auditLog.findMany({
        where: { entityType: { not: '' } },
        distinct: ['entityType'],
        select: { entityType: true },
        orderBy: { entityType: 'asc' },
      }),
    ]);

    return {
      // Full catalog ∪ what the table already holds: both filters must offer
      // every value this system can record, not only ones that already
      // happened at least once.
      actions: mergeWithRecordedActions(
        recordedActions.map((row) => row.action),
      ),
      entityTypes: mergeWithRecordedEntityTypes(
        entityTypes.map((row) => row.entityType),
      ),
    };
  }

  async exportCsv(
    dto: ExportAuditLogsDto,
    adminId?: string,
  ): Promise<CsvExportFile> {
    const { from, to } = this.normalizeDateRange(dto.dateFrom, dto.dateTo, {
      maxRangeDays: AUDIT_LOG_EXPORT_MAX_RANGE_DAYS,
    });
    const where = this.buildWhere(dto, from, to);

    const total = await this.prisma.auditLog.count({ where });
    if (total > AUDIT_LOG_EXPORT_MAX_ROWS) {
      throw new BadRequestException(
        `Export exceeds maximum row limit (${AUDIT_LOG_EXPORT_MAX_ROWS.toLocaleString('en-US')}). Please narrow your filters.`,
      );
    }

    const rows = await this.prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, roleCode: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: AUDIT_LOG_EXPORT_MAX_ROWS,
    });

    const lines = [CSV_HEADERS.map((h) => this.toCsvField(h)).join(',')];
    for (const row of rows) {
      const oldValue = this.maskSensitive(
        row.oldValue as Record<string, unknown> | null,
      );
      const newValue = this.maskSensitive(
        row.newValue as Record<string, unknown> | null,
      );
      lines.push(
        [
          this.toCsvField(formatMmt(row.createdAt)),
          this.toCsvField(row.user?.name ?? ''),
          this.toCsvField(row.user?.email ?? ''),
          this.toCsvField(row.user?.roleCode ?? ''),
          this.toCsvField(row.action),
          this.toCsvField(row.entityType),
          this.toCsvField(
            oldValue === null
              ? ''
              : JSON.stringify(this.formatExportValue(oldValue, null)),
          ),
          this.toCsvField(
            newValue === null
              ? ''
              : JSON.stringify(this.formatExportValue(newValue, null)),
          ),
          this.toCsvField(formatIpAddress(row.ipAddress) ?? ''),
          this.toCsvField(summarizeUserAgent(row.userAgent)),
        ].join(','),
      );
    }

    // Single UTF-8 BOM, written as an escape sequence so no stray glyph can
    // leak into the file. Excel consumes it as an encoding signature, so the
    // first header cell still reads exactly "Timestamp" while non-ASCII actor
    // names/user agents stay legible.
    const content = Buffer.from(`\uFEFF${lines.join('\r\n')}`, 'utf8');
    const dateStamp = toMmtDateStamp(new Date());
    // Filename: audit-logs-startDate-endDate(todayDate).csv when a range is
    // provided; otherwise falls back to audit-logs-todayDate.csv. All three
    // stamps are Myanmar dates, so the name matches the days the rows cover.
    const rangeStamp =
      from && to
        ? `-${toMmtDateStamp(from)}-${toMmtDateStamp(to)}(${dateStamp})`
        : `-${dateStamp}`;
    await this.logExport(dto, adminId, rows.length);

    return { filename: `audit-logs${rangeStamp}.csv`, content };
  }

  /**
   * Appends the optional `AUDIT_EXPORT` self-audit event (BR-AUDIT-035, FDS
   * export step 7).
   *
   * It runs after the read and row-cap checks, so the new event can never
   * influence its own result set. Only filter values and counts are recorded -
   * never exported row data - and the IP address/User-Agent are stamped by the
   * request-metadata hook. A failed write must not break a successful export,
   * so it is logged rather than rethrown.
   */
  private async logExport(
    dto: ExportAuditLogsDto,
    adminId: string | undefined,
    rowCount: number,
  ): Promise<void> {
    if (!adminId) return;

    try {
      await this.logAction({
        userId: adminId,
        action: AUDIT_EXPORT_ACTION,
        entityType: 'AuditLog',
        newValue: {
          format: ExportFormat.CSV,
          rowCount,
          filters: this.exportFilterSummary(dto),
        },
      });
    } catch (error) {
      console.error(
        `Failed to record audit export event: ${(error as Error).message}`,
      );
    }
  }

  /** Non-empty export filters only, so the event mirrors what was requested. */
  private exportFilterSummary(dto: ExportAuditLogsDto): ExportFilterSummary {
    const summary: ExportFilterSummary = {};
    if (dto.userId) summary.userId = dto.userId;
    if (dto.action?.length) summary.action = dto.action;
    if (dto.entityType?.length) summary.entityType = dto.entityType;
    if (dto.entityId) summary.entityId = dto.entityId;
    if (dto.dateFrom) summary.dateFrom = dto.dateFrom;
    if (dto.dateTo) summary.dateTo = dto.dateTo;
    if (dto.ipAddress) summary.ipAddress = dto.ipAddress;
    if (dto.search) summary.search = dto.search;
    return summary;
  }

  async remove(
    dto: DeleteAuditLogsDto,
    adminId: string,
  ): Promise<DeleteResult> {
    if (dto.olderThanDays < AUDIT_LOG_MIN_RETENTION_DAYS) {
      throw new BadRequestException(
        `Minimum retention period is ${AUDIT_LOG_MIN_RETENTION_DAYS} days. Records and files younger than ${AUDIT_LOG_MIN_RETENTION_DAYS} days cannot be deleted.`,
      );
    }

    const cutoff = new Date(
      Date.now() - dto.olderThanDays * 24 * 60 * 60 * 1000,
    );
    const recordIds = dto.recordIds?.length ? dto.recordIds : undefined;
    let deletedRecords = 0;

    if (recordIds) {
      const targets = await this.prisma.auditLog.findMany({
        where: { id: { in: recordIds } },
        select: { id: true, createdAt: true },
      });

      // Atomic explicit-ID request: every target must exist and be eligible.
      if (targets.length !== recordIds.length) {
        throw new BadRequestException(
          'One or more specified records do not exist.',
        );
      }
      const ineligible = targets.find(
        (t) => t.createdAt.getTime() >= cutoff.getTime(),
      );
      if (ineligible) {
        throw new BadRequestException(
          `Records younger than ${AUDIT_LOG_MIN_RETENTION_DAYS} days cannot be deleted.`,
        );
      }

      const result = await this.prisma.auditLog.deleteMany({
        where: { id: { in: recordIds } },
      });
      deletedRecords = result.count;
    } else {
      const eligible = await this.prisma.auditLog.count({
        where: { createdAt: { lt: cutoff } },
      });
      if (eligible === 0) {
        throw new BadRequestException(
          `No records or files eligible for deletion (must be >= ${AUDIT_LOG_MIN_RETENTION_DAYS} days old).`,
        );
      }

      // Controlled batches so large purges do not hold one long lock.
      for (;;) {
        const batch = await this.prisma.auditLog.findMany({
          where: { createdAt: { lt: cutoff } },
          select: { id: true },
          take: DELETE_BATCH_SIZE,
        });
        if (batch.length === 0) break;
        const result = await this.prisma.auditLog.deleteMany({
          where: { id: { in: batch.map((r) => r.id) } },
        });
        deletedRecords += result.count;
        if (batch.length < DELETE_BATCH_SIZE) break;
      }
    }

    const deletedFiles = 0;

    await this.logAction({
      userId: adminId,
      action: AUDIT_DELETE_ACTION,
      entityType: 'AuditLog',
      newValue: {
        deletedRecords,
        deletedFiles,
        olderThanDays: dto.olderThanDays,
        recordIds: recordIds ?? null,
      },
    });

    return { deletedRecords, deletedFiles };
  }

  async logAction(data: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    oldValue?: Prisma.InputJsonValue;
    newValue?: Prisma.InputJsonValue;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId ?? null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId ?? null,
        oldValue: data.oldValue,
        newValue: data.newValue,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private buildWhere(
    dto: Pick<
      ListAuditLogsDto,
      | 'userId'
      | 'action'
      | 'entityType'
      | 'entityId'
      | 'dateFrom'
      | 'dateTo'
      | 'ipAddress'
      | 'search'
    >,
    precomputedFrom?: Date,
    precomputedTo?: Date,
  ): Prisma.AuditLogWhereInput {
    const conditions: Prisma.AuditLogWhereInput[] = [];

    if (dto.userId) conditions.push({ userId: dto.userId });
    if (dto.action?.length) {
      // Selecting AUDIT_LOG_DELETE also matches rows stored before the action
      // was renamed, so they stay findable under the current label.
      const actions = dto.action.includes(AUDIT_DELETE_ACTION)
        ? [...new Set([...dto.action, ...LEGACY_AUDIT_DELETE_ACTIONS])]
        : dto.action;
      conditions.push({ action: { in: actions } });
    }
    if (dto.entityType?.length)
      conditions.push({ entityType: { in: dto.entityType } });
    if (dto.entityId) conditions.push({ entityId: dto.entityId });
    if (dto.ipAddress) {
      conditions.push({
        OR: ipAddressVariants(dto.ipAddress).map((ip) => ({
          ipAddress: { contains: ip },
        })),
      });
    }

    let from = precomputedFrom;
    let to = precomputedTo;
    if (!from && !to && (dto.dateFrom || dto.dateTo)) {
      const range = this.normalizeDateRange(dto.dateFrom, dto.dateTo);
      from = range.from;
      to = range.to;
    }
    if (from || to) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (from) createdAt.gte = from;
      if (to) createdAt.lte = to;
      conditions.push({ createdAt });
    }

    if (dto.search) {
      const term = dto.search;
      conditions.push({
        OR: [
          { action: { contains: term, mode: 'insensitive' } },
          { entityType: { contains: term, mode: 'insensitive' } },
          { user: { name: { contains: term, mode: 'insensitive' } } },
          { user: { email: { contains: term, mode: 'insensitive' } } },
        ],
      });
    }

    return conditions.length ? { AND: conditions } : {};
  }

  /**
   * BR-AUDIT-023: the date range is optional, but when used both ends are
   * required. date-only values are widened to full Myanmar day boundaries.
   */
  private normalizeDateRange(
    dateFrom: string | undefined,
    dateTo: string | undefined,
    options: { maxRangeDays?: number } = {},
  ): { from?: Date; to?: Date } {
    if (!dateFrom && !dateTo) return {};
    if (!dateFrom || !dateTo) {
      throw new BadRequestException(
        'Both dateFrom and dateTo are required when filtering by date range',
      );
    }

    const from = this.parseDate(dateFrom, 'dateFrom', 'start');
    const to = this.parseDate(dateTo, 'dateTo', 'end');
    if (to.getTime() < from.getTime()) {
      throw new BadRequestException(
        'dateTo must be greater than or equal to dateFrom',
      );
    }
    if (options.maxRangeDays !== undefined) {
      const rangeDays = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
      if (rangeDays > options.maxRangeDays) {
        throw new BadRequestException(
          `Date range cannot exceed ${options.maxRangeDays} days`,
        );
      }
    }
    return { from, to };
  }

  private parseDate(
    value: string,
    field: string,
    boundary: 'start' | 'end',
  ): Date {
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    let parsed: Date;

    if (isDateOnly) {
      // A date-only value names a Myanmar calendar day — the admin picked it
      // from a calendar of Myanmar dates — so the range is bounded by Myanmar
      // midnight, not UTC midnight. Bounding on UTC would push the first
      // 06:30 of the chosen day into the previous bucket and drop the last
      // 06:30 of the final day entirely.
      const iso =
        boundary === 'start'
          ? `${value}T00:00:00.000${MMT_OFFSET_SUFFIX}`
          : `${value}T23:59:59.999${MMT_OFFSET_SUFFIX}`;
      parsed = new Date(iso);
    } else {
      const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
      if (!hasOffset) {
        throw new BadRequestException(
          `${field} datetime must include a UTC offset`,
        );
      }
      parsed = new Date(value);
    }

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return parsed;
  }

  private toListItem(row: AuditLogWithUser): AuditLogListItem {
    return {
      id: row.id,
      userId: row.userId,
      userName: row.user?.name ?? null,
      userEmail: row.user?.email ?? null,
      userRole: row.user?.roleCode ?? null,
      action: row.action,
      entityType: row.entityType,
      // `entity_id` stays in the database (filters still use it) but is never
      // sent to the client: the UI does not display it.
      summary: this.buildSummary(row.action, row.entityType),
      ipAddress: formatIpAddress(row.ipAddress),
      createdAt: row.createdAt,
    };
  }

  private buildSummary(action: string, entityType: string): string {
    const humanized = action
      .split(/[._-]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    if (!entityType) return humanized;
    if (humanized.toLowerCase().includes(entityType.toLowerCase())) {
      return humanized;
    }
    return `${humanized} E${entityType}`;
  }

  private formatExportValue(value: unknown, key: string | null): unknown {
    if (typeof value === 'string' || typeof value === 'number') {
      return this.formatExportScalar(key, value);
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.formatExportValue(item, key));
    }
    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [childKey, nested] of Object.entries(
        value as Record<string, unknown>,
      )) {
        result[childKey] = this.formatExportValue(nested, childKey);
      }
      return result;
    }
    return value;
  }

  private formatExportScalar(
    key: string | null,
    value: string | number,
  ): string {
    const words = this.exportKeyWords(key);
    const isPercent = [...words].some((word) => EXPORT_PERCENT_WORDS.has(word));
    const isCurrency = [...words].some((word) =>
      EXPORT_CURRENCY_WORDS.has(word),
    );

    if (typeof value === 'string' && value.includes('%')) {
      const parsed = this.toFiniteNumber(value.replace(/%/g, ''));
      return parsed === null
        ? value
        : `${EXPORT_NUMBER_FORMAT.format(parsed)}%`;
    }

    const parsed = this.toFiniteNumber(value);
    if (parsed === null) {
      return typeof value === 'string' ? value : String(value);
    }

    if (isPercent) return `${EXPORT_NUMBER_FORMAT.format(parsed)}%`;

    const hasDecimal =
      typeof value === 'number'
        ? !Number.isInteger(value)
        : value.includes('.');
    if (isCurrency || hasDecimal) return EXPORT_NUMBER_FORMAT.format(parsed);

    return typeof value === 'string' ? value : String(value);
  }

  private exportKeyWords(key: string | null): Set<string> {
    if (!key) return new Set();
    const words = key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    return new Set(words);
  }

  private toFiniteNumber(value: string | number): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private maskSensitive(
    value: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (value === null || typeof value !== 'object') return value;
    return this.maskDeep(value) as Record<string, unknown>;
  }

  private maskDeep(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.maskDeep(item));
    }
    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, nested] of Object.entries(
        value as Record<string, unknown>,
      )) {
        result[key] = SENSITIVE_KEYS.has(key.toLowerCase())
          ? '***'
          : this.maskDeep(nested);
      }
      return result;
    }
    return value;
  }

  private toCsvField(value: unknown): string {
    let text = '';
    if (typeof value === 'string') {
      text = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      text = String(value);
    } else if (value !== null && value !== undefined) {
      text = JSON.stringify(value) ?? '';
    }
    return `"${text.replace(/"/g, '""')}"`;
  }
}
