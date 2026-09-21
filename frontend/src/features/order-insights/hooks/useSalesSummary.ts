import { useQuery } from '@tanstack/react-query';
import type { SalesSummaryDto } from '../types/merchantOrderInsights.types';
import { getSalesSummary } from '../services/merchantOrderService';

/** Loads the merchant sales-count summary. */
export function useSalesSummary() {
  return useQuery<SalesSummaryDto, Error>({
    queryKey: ['merchantSalesSummary'],
    queryFn: getSalesSummary,
  });
}