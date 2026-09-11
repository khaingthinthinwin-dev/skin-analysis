import { api } from "@/lib/api";

// Commission settings response (GET/PATCH /admin/commission)
export interface CommissionSettings {
  rate: string; // Decimal string, e.g. "12.00"
}

// Merchant commission report row (GET /admin/commission/reports)
export interface CommissionReport {
  merchantId: string;
  merchantName: string;
  commissionRate: string; // Decimal string – the rate applied to these orders
  orders: number;
  revenue: string; // Decimal string
  commission: string; // Decimal string
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CommissionReportsResponse {
  reports: CommissionReport[];
  pagination: PaginationMeta;
}

export interface CommissionReportFilter {
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

// Merchant payout row (GET /admin/revenue/payouts)
export interface Payout {
  id: string; // order id (payouts are flattened to one row per order)
  payoutId: string;
  merchantId: string;
  merchantName: string;
  orderId: string | null;
  commissionRate: string; // Decimal string – effective rate at payout creation
  totalAmount: string; // Decimal string
  commissionAmount: string; // Decimal string
  adFeeAmount: string; // Always "0.00" - ad fees are platform revenue, never deducted
  netAmount: string; // totalAmount - commissionAmount
  status: "pending" | "processing" | "completed" | "failed";
  failureReason?: string | null;
  createdAt: string;
  processedAt?: string | null;
  canDelete: boolean;
}

export interface PayoutsResponse {
  items: Payout[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PayoutProcessResult {
  payoutId: string;
  merchantId: string;
  totalAmount: string;
  commissionAmount: string;
  adFeeAmount: string;
  netAmount: string;
  status: "completed" | "failed";
  processedAt: string;
}

export interface PayoutFilter {
  status?: string;
  merchantId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

// Revenue KPI response (GET /admin/revenue/kpis)
export interface RevenueKPI {
  totalRevenue: string;
  totalCommission: string;
  adFeeRevenue: string;
  totalIncome: string;
  avgOrderValue: string;
  netRevenue: string;
}

// Revenue trend point (GET /admin/revenue/trends)
export interface TrendPoint {
  date: string; // 'YYYY-MM-DD' or 'YYYY-MM' for 1y range
  revenue: string;
  commission: string;
  adFee: string;
  totalIncome: string;
}

// Revenue forecast point (GET /admin/revenue/forecast)
export interface ForecastPoint {
  date: string;
  forecastRevenue: string;
  forecastCommission: string;
  forecastAdFee: string;
}

export interface RevenueForecast {
  forecastPoints: ForecastPoint[];
  note?: string;
}

// Revenue target (GET /admin/revenue/target)
export interface RevenueTarget {
  targetAmount: string;
  period: string;
  actualRevenue: string;
  progressPercent: string;
}

export type TargetPeriod = "monthly" | "quarterly";

export interface SaveRevenueTargetPayload {
  targetAmount: string;
  targetPeriod: TargetPeriod;
}

export interface SaveRevenueTargetResult {
  targetAmount: string;
  targetPeriod: string;
  actualRevenue: string;
  progressPercent: string;
}

// Order payment status (GET /admin/revenue/payments/status)
export interface PaymentStatus {
  completed: number;
  pending: number;
}

// Ad fee revenue (GET /admin/revenue/ad-fee)
export interface AdFeeKpis {
  totalAdFees: string;
  activeAds: number;
  pendingPayments: number;
  completedPayments: number;
}

export interface AdFeeTrendPoint {
  date: string;
  adFee: string;
}

export interface AdFeePaymentStatus {
  completed: number;
  pending: number;
  refunded: number;
}

export interface AdFeeRevenueResponse {
  adFeeKpis: AdFeeKpis;
  adFeeTrendPoints: AdFeeTrendPoint[];
  adFeePaymentStatus: AdFeePaymentStatus;
}

export type TrendRange = "7d" | "30d" | "90d" | "1y";

export type ExportReportType = "commission" | "revenue" | "payout";

export type ExportFormat = "csv" | "xlsx";

export interface ExportRequestBody {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  format: ExportFormat;
}

export interface PayoutMerchant {
  id: string;
  name: string;
}

export const commissionService = {
  getSettings: async (): Promise<CommissionSettings> => {
    const response = await api.get<{ data: CommissionSettings }>(
      "/admin/commission",
    );
    return response.data.data;
  },

  updateSettings: async (rate: number): Promise<CommissionSettings> => {
    // Backend DTO expects a decimal string to preserve precision.
    const response = await api.patch<{ data: CommissionSettings }>(
      "/admin/commission",
      { rate: String(rate) },
    );
    return response.data.data;
  },

  getReports: async (
    params?: CommissionReportFilter,
  ): Promise<CommissionReportsResponse> => {
    const response = await api.get<{ data: CommissionReportsResponse }>(
      "/admin/commission/reports",
      { params },
    );
    return response.data.data;
  },

  getPayouts: async (params?: PayoutFilter): Promise<PayoutsResponse> => {
    const response = await api.get<{ data: PayoutsResponse }>(
      "/admin/revenue/payouts",
      { params },
    );
    return response.data.data;
  },

  getPayoutMerchants: async (): Promise<PayoutMerchant[]> => {
    const response = await api.get<{ data: PayoutMerchant[] }>(
      "/admin/revenue/payouts/merchants",
    );
    return response.data.data;
  },

  processPayout: async (payoutId: string): Promise<PayoutProcessResult> => {
    const response = await api.post<{ data: PayoutProcessResult }>(
      `/admin/revenue/payouts/${payoutId}/process`,
    );
    return response.data.data;
  },

  deletePayouts: async (payoutIds: string[]): Promise<{ payoutIds: string[]; deleted: boolean }> => {
    const response = await api.delete<{ data: { payoutIds: string[]; deleted: boolean } }>(
      "/admin/revenue/payouts",
      { data: { payoutIds } },
    );
    return response.data.data;
  },

  getKpis: async (range: TrendRange): Promise<RevenueKPI> => {
    const response = await api.get<{ data: { kpis: RevenueKPI } }>(
      "/admin/revenue/kpis",
      { params: { range } },
    );
    return response.data.data.kpis;
  },

  getTrends: async (range: TrendRange): Promise<TrendPoint[]> => {
    const response = await api.get<{ data: { trendPoints: TrendPoint[] } }>(
      "/admin/revenue/trends",
      { params: { range } },
    );
    return response.data.data.trendPoints;
  },

  getForecast: async (range: TrendRange): Promise<RevenueForecast> => {
    const response = await api.get<{ data: RevenueForecast }>(
      "/admin/revenue/forecast",
      { params: { range } },
    );
    return response.data.data;
  },

  getTarget: async (period: TargetPeriod): Promise<RevenueTarget | null> => {
    const response = await api.get<{ data: { target: RevenueTarget | null } }>(
      "/admin/revenue/target",
      { params: { period } },
    );
    return response.data.data.target;
  },

  saveTarget: async (
    payload: SaveRevenueTargetPayload,
  ): Promise<SaveRevenueTargetResult> => {
    const response = await api.put<{ data: SaveRevenueTargetResult }>(
      "/admin/revenue/targets",
      payload,
    );
    return response.data.data;
  },

  getPaymentStatus: async (range: TrendRange): Promise<PaymentStatus> => {
    const response = await api.get<{ data: PaymentStatus }>(
      "/admin/revenue/payments/status",
      { params: { range } },
    );
    return response.data.data;
  },

  getAdFeeRevenue: async (range: TrendRange): Promise<AdFeeRevenueResponse> => {
    const response = await api.get<{ data: AdFeeRevenueResponse }>(
      "/admin/revenue/ad-fee",
      { params: { range } },
    );
    return response.data.data;
  },

  exportReport: async (
    type: ExportReportType,
    body: ExportRequestBody,
  ): Promise<void> => {
    const url =
      type === "commission"
        ? "/admin/commission/export"
        : type === "revenue"
          ? "/admin/revenue/export"
          : "/admin/revenue/payouts/export";
    const response = await api.post(url, body, { responseType: "blob" });
    const disposition =
      (response.headers?.["content-disposition"] as string) || "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] ?? buildExportFilename(type, body);
    const blob = new Blob([response.data as BlobPart]);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  },
};

function toDateString(date: string | Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

// Build the fallback filename in the same format as the backend:
// "{label} report {YYYYMMDD}-{YYYYMMDD}({YYYYMMDD}).{ext}"
// Used when the browser blocks reading the Content-Disposition header (CORS).
function buildExportFilename(type: ExportReportType, body: ExportRequestBody) {
  const dateRange = `${toDateString(body.dateFrom)}-${toDateString(body.dateTo)}`;
  const generationDate = toDateString(new Date());
  return `${type} report ${dateRange}(${generationDate}).${body.format}`;
}
