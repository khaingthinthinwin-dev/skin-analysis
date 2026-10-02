import { api } from '@/lib/api';
import type { AuditLogQueryState } from '../schemas/auditLog.schema';
import { toMmtDateStamp } from '../utils/datetime';

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
  createdAt: string;
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

export interface DeleteAuditLogsResult {
  deletedRecords: number;
  deletedFiles: number;
}

export interface CsvDownload {
  blob: Blob;
  filename: string;
}

export interface ExportAuditLogsParams {
  userId?: string;
  action?: string[];
  entityType?: string[];
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
  ipAddress?: string;
  search?: string;
  format: 'csv';
}

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
}

const serializeParams = (params: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length > 0) out[key] = value;
    } else {
      out[key] = value;
    }
  }
  return out;
};

export function toListParams(query: AuditLogQueryState): Record<string, unknown> {
  return serializeParams({
    userId: query.userId,
    action: query.action,
    entityType: query.entityType,
    entityId: query.entityId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    ipAddress: query.ipAddress,
    search: query.search,
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });
}

export function toExportParams(query: AuditLogQueryState): ExportAuditLogsParams {
  const base = serializeParams({
    userId: query.userId,
    action: query.action,
    entityType: query.entityType,
    entityId: query.entityId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    ipAddress: query.ipAddress,
    search: query.search,
    format: 'csv',
  });
  return base as unknown as ExportAuditLogsParams;
}

function parseFilename(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback;
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match?.[1] ?? fallback;
}

export const auditLogService = {
  getLogs: async (params: Record<string, unknown>): Promise<PaginatedAuditLogs> => {
    const response = await api.get('/admin/audit-logs', {
      params: serializeParams(params),
      paramsSerializer: { serialize: (p) => {
        const search = new URLSearchParams();
        for (const [key, value] of Object.entries(p as Record<string, unknown>)) {
          if (value === undefined || value === null || value === '') continue;
          if (Array.isArray(value)) {
            for (const item of value) search.append(key, String(item));
          } else {
            search.append(key, String(value));
          }
        }
        return search.toString();
      } },
    });
    return response.data.data;
  },

  getLogDetail: async (id: string): Promise<AuditLogDetail> => {
    const response = await api.get(`/admin/audit-logs/${id}`);
    return response.data.data;
  },

  getFilterOptions: async (): Promise<AuditFilterOptions> => {
    const response = await api.get('/admin/audit-logs/filters');
    return response.data.data;
  },

  exportCsv: async (params: ExportAuditLogsParams): Promise<CsvDownload> => {
    const response = await api.post('/admin/audit-logs/export', params, {
      responseType: 'blob',
      headers: { 'Content-Type': 'application/json' },
    });
    const dateStamp = toMmtDateStamp();
    // Fallback matches the backend name: audit-logs-startDate-endDate(today).csv
    const rangeStamp =
      params.dateFrom && params.dateTo
        ? `-${params.dateFrom.slice(0, 10)}-${params.dateTo.slice(0, 10)}(${dateStamp})`
        : `-${dateStamp}`;
    const filename = parseFilename(
      response.headers?.['content-disposition'] as string | undefined,
      `audit-logs${rangeStamp}.csv`,
    );
    return { blob: response.data as Blob, filename };
  },

  deleteLogs: async (body: {
    olderThanDays: number;
    recordIds?: string[];
  }): Promise<DeleteAuditLogsResult> => {
    const response = await api.request({
      url: '/admin/audit-logs/files',
      method: 'DELETE',
      data: serializeParams(body),
    });
    return response.data.data;
  },

  searchUsers: async (search: string): Promise<UserSearchResult[]> => {
    const response = await api.get('/admin/users', {
      params: { search, limit: 10 },
    });
    const items = response.data.data?.items ?? [];
    return items.map(
      (item: { id: string; name: string; email: string }) => ({
        id: item.id,
        name: item.name,
        email: item.email,
      }),
    );
  },
};

export function downloadCsv(download: CsvDownload): void {
  const url = URL.createObjectURL(download.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = download.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
