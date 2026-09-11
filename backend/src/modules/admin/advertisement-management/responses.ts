import { ApprovalStatus, PaymentStatus, Placement, Tier } from './enums';

export interface AdminAdvertisementResponseDto {
  id: string;
  shopId: string;
  shopName: string;
  title: string;
  announcementMessage: string;
  content: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  placement: Placement | null;
  tier: Tier | null;
  isActive: boolean;
  approvalStatus: ApprovalStatus;
  paymentStatus: PaymentStatus;
  paymentAmount: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  weekNumber: number | null;
  createdAt: string;
}

export interface AdminAdDetailResponseDto extends AdminAdvertisementResponseDto {
  analytics: {
    impressions: number;
    clicks: number;
    ctr: number;
  };
  feeInfo: {
    dailyRate: string;
    durationDays: number;
    totalFee: string;
  };
  paymentInfo: {
    paymentStatus: PaymentStatus;
    amount: string;
    paidAt: string | null;
  };
}

export interface AdminAdApprovalResponseDto {
  id: string;
  approvalStatus: ApprovedOrRejected;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  updatedAt: string;
}

export interface AdminBulkOperationResponseDto {
  approved?: number;
  rejected?: number;
  failed: number;
  refundsProcessed?: number;
  refundsFailed?: number;
  results: Array<{
    id: string;
    approvalStatus: ApprovedOrRejected;
    refundStatus?: 'processed' | 'failed';
  }>;
}

export interface AdminAdFeeSettingResponseDto {
  id: string;
  placement: Placement;
  tier: Tier;
  dailyRate: string;
  durationDays: number;
  maxAds: number;
  isActive: boolean;
  totalFee: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAdFeeHistoryResponseDto {
  id: string;
  placement: Placement;
  tier: Tier;
  oldDailyRate: string | null;
  newDailyRate: string;
  oldDurationDays: number | null;
  newDurationDays: number;
  oldMaxAds: number | null;
  newMaxAds: number;
  changedBy: string;
  changedByName: string;
  changeReason: string | null;
  effectiveFrom: string;
  createdAt: string;
}

export interface RevenueAnalyticsResponseDto {
  summary: {
    totalRevenue: number;
    totalAdsApproved: number;
    totalFeesCollected: number;
    avgRevenuePerAd: number;
    totalRefunds: number;
  };
  byPlacement: Array<{
    placement: Placement;
    placementName: string;
    adCount: number;
    revenue: number;
    avgCtr: number;
  }>;
  byTier: Array<{
    tier: Tier;
    tierName: string;
    adCount: number;
    revenue: number;
    avgCtr: number;
  }>;
  trend: Array<{
    date: string;
    revenue: number;
    adCount: number;
  }>;
}

export interface PaginatedResponseDto<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type ApprovedOrRejected = ApprovalStatus.APPROVED | ApprovalStatus.REJECTED;
