import { SummaryPeriod } from './dto/order-insights.types';

export interface OrderInsightsConfig {
  defaultPageSize: number;
  maxPageSize: number;
  defaultSummaryPeriod: SummaryPeriod;
  summaryCacheTtlSeconds: number;
  rateLimitListPerMinute: number;
  rateLimitSummaryPerMinute: number;
  defaultCommissionRate: string;
}

export const ORDER_INSIGHTS_CONFIG: OrderInsightsConfig = {
  defaultPageSize: Number(process.env.OI_ORDER_LIST_PAGE_SIZE) || 20,
  maxPageSize: Number(process.env.OI_TABLE_MAX_PAGE_SIZE) || 100,
  defaultSummaryPeriod: 'this_month',
  summaryCacheTtlSeconds:
    Number(process.env.OI_SUMMARY_CACHE_TTL_SECONDS) || 300,
  rateLimitListPerMinute: 60,
  rateLimitSummaryPerMinute: 30,
  defaultCommissionRate: '12.00',
};
