import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commissionService } from '../services/commission.service';
import type {
  TrendRange,
  TargetPeriod,
  RevenueKPI,
  TrendPoint,
  RevenueForecast,
  RevenueTarget,
  SaveRevenueTargetPayload,
  PaymentStatus,
  AdFeeRevenueResponse,
  PayoutMerchant,
} from '../services/commission.service';

// Revenue dashboard data for the Revenue tab (DD_02 §5.4).
// Fetches KPIs, trends, forecast, target, payment status, and ad-fee revenue
// in parallel. The trend range is shared across trends/forecast/payments/ad-fee.
export function useRevenue(range: TrendRange = '30d', period: TargetPeriod = 'monthly') {
  const queryClient = useQueryClient();

  const kpisQuery = useQuery<RevenueKPI>({
    queryKey: ['admin', 'revenue', 'kpis', range],
    queryFn: () => commissionService.getKpis(range),
  });

  const trendsQuery = useQuery<TrendPoint[]>({
    queryKey: ['admin', 'revenue', 'trends', range],
    queryFn: () => commissionService.getTrends(range),
  });

  const forecastQuery = useQuery<RevenueForecast>({
    queryKey: ['admin', 'revenue', 'forecast', range],
    queryFn: () => commissionService.getForecast(range),
  });

  const targetQuery = useQuery<RevenueTarget | null>({
    queryKey: ['admin', 'revenue', 'target', period],
    queryFn: () => commissionService.getTarget(period),
  });

  const paymentStatusQuery = useQuery<PaymentStatus>({
    queryKey: ['admin', 'revenue', 'payments', range],
    queryFn: () => commissionService.getPaymentStatus(range),
  });

  const adFeeQuery = useQuery<AdFeeRevenueResponse>({
    queryKey: ['admin', 'revenue', 'ad-fee', range],
    queryFn: () => commissionService.getAdFeeRevenue(range),
  });

  const saveTargetMutation = useMutation({
    mutationFn: (payload: SaveRevenueTargetPayload) =>
      commissionService.saveTarget(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'revenue', 'target'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'revenue', 'kpis'] });
    },
  });

  const payoutMerchantsQuery = useQuery<PayoutMerchant[]>({
    queryKey: ['admin', 'revenue', 'payout-merchants'],
    queryFn: commissionService.getPayoutMerchants,
  });

  return {
    kpisQuery,
    trendsQuery,
    forecastQuery,
    targetQuery,
    paymentStatusQuery,
    adFeeQuery,
    saveTargetMutation,
    payoutMerchantsQuery,
  };
}
