import { useQuery } from '@tanstack/react-query';
import { revenuePeriodSchema, type RevenuePeriodFormData } from '../schemas/orderFilters.schema';
import type { RevenueSummaryDto } from '../types/merchantOrderInsights.types';
import { getRevenueSummary } from '../services/merchantOrderService';

/** Loads a merchant revenue summary only when the selected period is valid. */
export function useRevenueSummary(period: RevenuePeriodFormData) {
  const isValid = revenuePeriodSchema.safeParse(period).success;
  return useQuery<RevenueSummaryDto, Error>({
    queryKey: ['merchantRevenueSummary', period.period, period.from, period.to],
    queryFn: () => getRevenueSummary(period),
    enabled: isValid,
  });
}