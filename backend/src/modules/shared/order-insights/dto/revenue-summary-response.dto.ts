import { CommissionRateSource, SummaryPeriod } from './order-insights.types';

export interface SummaryPeriodDto {
  code: SummaryPeriod;
  from: string;
  to: string;
}

export interface RevenueSummaryResponseDto {
  sales: string;
  commission: string;
  revenue: string;
  aov: string;
  orderCount: number;
  commissionRate: string;
  commissionRateSource: CommissionRateSource;
  commissionRateLocked: boolean;
  period: SummaryPeriodDto;
}

export interface RevenueSummaryEnvelopeDto {
  revenueSummary: RevenueSummaryResponseDto;
}
