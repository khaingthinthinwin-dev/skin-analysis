import { useQuery } from '@tanstack/react-query'
import { skinAnalysisService } from '../services/skin-analysis.service'

const TRENDS_STALE_MS = 5 * 60 * 1000 // 5 minutes

export function useAnalysisTrends(range: '30d' | '90d' | '1y' | 'all' = 'all') {
  return useQuery({
    queryKey: ['skin-analysis', 'trends', range],
    queryFn: () => skinAnalysisService.getTrends(range),
    staleTime: TRENDS_STALE_MS,
    // Auto-disables if not enough data 窶・handled by minPointsMet in response
  })
}

// Hook for chart-ready data
export function useTrendChartData(range: '30d' | '90d' | '1y' | 'all' = 'all') {
  const { data, ...rest } = useAnalysisTrends(range)

  return {
    ...rest,
    healthScoreData: data?.healthScoreTrend ?? [],
    hydrationData: data?.hydrationTrend ?? [],
    minPointsMet: data?.minPointsMet ?? false,
    // Format for Recharts
    formattedHealthScore: data?.healthScoreTrend.map((p) => ({
      date: p.date,
      value: p.value,
      analysisId: p.analysisId,
    })) ?? [],
    formattedHydration: data?.hydrationTrend.map((p) => ({
      date: p.date,
      value: p.value,
      analysisId: p.analysisId,
    })) ?? [],
  }
}