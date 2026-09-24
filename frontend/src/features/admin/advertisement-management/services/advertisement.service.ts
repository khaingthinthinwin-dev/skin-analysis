import { api } from '@/lib/api';
import type {
  AdminAdApprovalResult,
  AdminAdDetail,
  AdminAdFeeSetting,
  AdminAdListQuery,
  AdminBulkApproveInput,
  AdminBulkRejectInput,
  AdminBulkResult,
  AdminRejectInput,
  ApprovalStatus,
  CreateFeeSettingInput,
  DeactivateFeeInput,
  EditFeeSettingInput,
  ReactivateFeeInput,
  PaginatedAdminAdList,
  PaginatedFeeHistory,
  Placement,
  RevenueAnalytics,
  RevenueAnalyticsQuery,
  Tier,
} from '@/types/admin-ad-management';

export interface AdminAdFeeHistoryQuery {
  placement?: Placement;
  tier?: Tier;
  page?: number;
  limit?: number;
}

export interface CsvDownload {
  blob: Blob;
  filename: string;
}

export interface ExportParams {
  dateFrom: string;
  dateTo: string;
  format: 'csv';
}

export interface AdPerformanceExportParams extends ExportParams {
  placement?: Placement[];
  tier?: Tier[];
  status?: ApprovalStatus[];
}

export interface SubmissionHistoryExportParams extends ExportParams {
  shop?: string;
}

export interface FeeHistoryExportParams extends ExportParams {
  placement?: Placement[];
  tier?: Tier[];
}

const EXPORT_BASENAMES = {
  ad_performance: 'ad_performance',
  submission_history: 'submission_history',
  fee_history: 'fee_history',
} as const;

const buildExportFilename = (base: string, dateFrom: string, dateTo: string): string =>
  `${base}_from${dateFrom}_to${dateTo}.csv`

const serializeParams = <P extends object>(params: P): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== '') {
          search.append(key, String(item));
        }
      }
    } else {
      search.append(key, String(value));
    }
  }
  return search.toString();
};

// ---------------------------------------------------------------------------
// Ad Review
// ---------------------------------------------------------------------------

export const advertisementService = {
  listAds: async (params?: AdminAdListQuery): Promise<PaginatedAdminAdList> => {
    const response = await api.get('/admin/ads', {
      params,
      paramsSerializer: serializeParams,
    });
    return response.data.data;
  },

  getAdDetail: async (id: string): Promise<AdminAdDetail> => {
    const response = await api.get(`/admin/ads/${id}`);
    return response.data.data;
  },

  approveAd: async (id: string): Promise<AdminAdApprovalResult> => {
    const response = await api.post(`/admin/ads/${id}/approve`);
    return response.data.data;
  },

  rejectAd: async (
    id: string,
    input: AdminRejectInput,
  ): Promise<AdminAdApprovalResult> => {
    const response = await api.post(`/admin/ads/${id}/reject`, input);
    return response.data.data;
  },

  bulkApproveAds: async (
    input: AdminBulkApproveInput,
  ): Promise<AdminBulkResult> => {
    const response = await api.post('/admin/ads/bulk/approve', input);
    return response.data.data;
  },

  bulkRejectAds: async (
    input: AdminBulkRejectInput,
  ): Promise<AdminBulkResult> => {
    const response = await api.post('/admin/ads/bulk/reject', input);
    return response.data.data;
  },

  // -------------------------------------------------------------------------
  // Fee Settings
  // -------------------------------------------------------------------------

  listFeeSettings: async (): Promise<AdminAdFeeSetting[]> => {
    const response = await api.get('/admin/ad-fees');
    return response.data.data;
  },

  createFeeSetting: async (
    input: CreateFeeSettingInput,
  ): Promise<AdminAdFeeSetting> => {
    const response = await api.post('/admin/ad-fees', input);
    return response.data.data;
  },

  updateFeeSetting: async (
    id: string,
    input: EditFeeSettingInput,
  ): Promise<AdminAdFeeSetting> => {
    const response = await api.put(`/admin/ad-fees/${id}`, input);
    return response.data.data;
  },

  deactivateFeeSetting: async (
    id: string,
    input: DeactivateFeeInput,
  ): Promise<AdminAdFeeSetting> => {
    const response = await api.patch(`/admin/ad-fees/${id}/deactivate`, input);
    return response.data.data;
  },

  reactivateFeeSetting: async (
    id: string,
    input: ReactivateFeeInput,
  ): Promise<AdminAdFeeSetting> => {
    const response = await api.patch(`/admin/ad-fees/${id}/reactivate`, input);
    return response.data.data;
  },

  listFeeHistory: async (
    params?: AdminAdFeeHistoryQuery,
  ): Promise<PaginatedFeeHistory> => {
    const response = await api.get('/admin/ad-fees/history', {
      params,
      paramsSerializer: serializeParams,
    });
    return response.data.data;
  },

  // -------------------------------------------------------------------------
  // Analytics
  // -------------------------------------------------------------------------

  getRevenueAnalytics: async (
    params: RevenueAnalyticsQuery,
  ): Promise<RevenueAnalytics> => {
    const response = await api.get('/admin/ads/analytics/revenue', {
      params,
      paramsSerializer: serializeParams,
    });
    return response.data.data;
  },

  // -------------------------------------------------------------------------
  // Export Reports (CSV)
  // -------------------------------------------------------------------------

  exportAdPerformance: async (
    input: AdPerformanceExportParams,
  ): Promise<CsvDownload> => {
    const response = await api.post('/admin/ads/export/ad-performance', input, {
      responseType: 'blob',
    });
    return { blob: response.data as Blob, filename: buildExportFilename(EXPORT_BASENAMES.ad_performance, input.dateFrom, input.dateTo) };
  },

  exportSubmissionHistory: async (
    input: SubmissionHistoryExportParams,
  ): Promise<CsvDownload> => {
    const response = await api.post(
      '/admin/ads/export/submission-history',
      input,
      { responseType: 'blob' },
    );
    return { blob: response.data as Blob, filename: buildExportFilename(EXPORT_BASENAMES.submission_history, input.dateFrom, input.dateTo) };
  },

  exportFeeHistory: async (
    input: FeeHistoryExportParams,
  ): Promise<CsvDownload> => {
    const response = await api.post('/admin/ads/export/fee-history', input, {
      responseType: 'blob',
    });
    return { blob: response.data as Blob, filename: buildExportFilename(EXPORT_BASENAMES.fee_history, input.dateFrom, input.dateTo) };
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

export type { AdminAdApprovalResult };